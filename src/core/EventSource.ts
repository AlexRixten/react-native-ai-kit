import type {
  SSEMessageEvent,
  SSEErrorEvent,
  EventSourceStatus,
} from '../types/events';

const XMLReadyStateMap = [
  'UNSENT',
  'OPENED',
  'HEADERS_RECEIVED',
  'LOADING',
  'DONE',
] as const;

type EventHandler = (event: SSEMessageEvent | SSEErrorEvent) => void;
type EventHandlersMap = Record<string, EventHandler[]>;

export default class EventSource {
  ERROR: EventSourceStatus = -1;
  CONNECTING: EventSourceStatus = 0;
  OPEN: EventSourceStatus = 1;
  CLOSED: EventSourceStatus = 2;

  CRLF = '\r\n';
  LF = '\n';
  CR = '\r';

  lastEventId: string | null = null;
  status: EventSourceStatus;

  private eventHandlers: EventHandlersMap = {
    open: [],
    message: [],
    error: [],
    done: [],
    close: [],
  };

  private method: string;
  private timeout: number;
  private timeoutBeforeConnection: number;
  private withCredentials: boolean;
  private body: string | undefined;
  private debug: boolean;
  private interval: number;
  private lineEndingCharacter: string | null;
  private headers: Record<string, string>;
  private _xhr: XMLHttpRequest | null = null;
  private _pollTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastIndexProcessed = 0;
  readonly url: string;

  constructor(url: string, options: EventSourceOptions = {}) {
    this.lastEventId = null;
    this.status = this.CONNECTING;

    this.method = options.method || 'GET';
    this.timeout = options.timeout ?? 0;
    this.timeoutBeforeConnection = options.timeoutBeforeConnection ?? 500;
    this.withCredentials = options.withCredentials || false;
    this.body = options.body || undefined;
    this.debug = options.debug || false;
    this.interval = options.pollingInterval ?? 5000;
    this.lineEndingCharacter = options.lineEndingCharacter || null;

    const defaultHeaders: Record<string, string> = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
    };

    this.headers = { ...defaultHeaders, ...options.headers };

    this._xhr = null;
    this._pollTimer = null;
    this._lastIndexProcessed = 0;

    if (
      !url ||
      (typeof url !== 'string' &&
        typeof (url as { toString?: unknown }).toString !== 'function')
    ) {
      throw new SyntaxError('[EventSource] Invalid URL argument.');
    }

    this.url =
      typeof url === 'string'
        ? url
        : String((url as { toString: () => string }).toString());

    this._pollAgain(this.timeoutBeforeConnection, true);
  }

  private _pollAgain(time: number, allowZero: boolean) {
    if (time > 0 || allowZero) {
      this._logDebug(`[EventSource] Will open new connection in ${time} ms.`);
      this._pollTimer = setTimeout(() => {
        this.open();
      }, time);
    }
  }

  open() {
    try {
      this.status = this.CONNECTING;
      this._lastIndexProcessed = 0;

      this._xhr = new XMLHttpRequest();
      this._xhr.open(this.method, this.url, true);

      if (this.withCredentials) {
        this._xhr.withCredentials = true;
      }

      for (const [key, value] of Object.entries(this.headers)) {
        if (value !== undefined && value !== null) {
          this._xhr.setRequestHeader(key, value);
        }
      }

      if (this.lastEventId !== null) {
        this._xhr.setRequestHeader('Last-Event-ID', this.lastEventId);
      }

      this._xhr.timeout = this.timeout;

      this._xhr.onreadystatechange = () => {
        if (this.status === this.CLOSED) {
          return;
        }

        const xhr = this._xhr;
        if (!xhr) {
          return;
        }

        this._logDebug(
          `[EventSource][onreadystatechange] ReadyState: ${
            XMLReadyStateMap[xhr.readyState as number] || 'Unknown'
          }(${xhr.readyState}), status: ${xhr.status}`
        );

        if (
          ![XMLHttpRequest.DONE, XMLHttpRequest.LOADING].includes(
            xhr.readyState as 3 | 4
          )
        ) {
          return;
        }

        if (xhr.status >= 200 && xhr.status < 400) {
          if (this.status === this.CONNECTING) {
            this.status = this.OPEN;
            this.dispatch('open', { type: 'open' } as SSEMessageEvent);
            this._logDebug(
              '[EventSource][onreadystatechange][OPEN] Connection opened.'
            );
          }

          this._handleEvent(xhr.responseText || '');

          if (xhr.readyState === XMLHttpRequest.DONE) {
            this._logDebug(
              '[EventSource][onreadystatechange][DONE] Operation done.'
            );
            this._pollAgain(this.interval, false);
            this.dispatch('done', { type: 'done' } as SSEMessageEvent);
          }
        } else if (xhr.status !== 0) {
          this.status = this.ERROR;
          this.dispatch('error', {
            type: 'error',
            message: xhr.responseText,
            xhrStatus: xhr.status,
            xhrState: xhr.readyState,
          } as SSEErrorEvent);

          if (xhr.readyState === XMLHttpRequest.DONE) {
            this._logDebug(
              '[EventSource][onreadystatechange][ERROR] Response status error.'
            );
            this._pollAgain(this.interval, false);
          }
        }
      };

      this._xhr.onerror = () => {
        if (this.status === this.CLOSED) {
          return;
        }

        this.status = this.ERROR;
        this.dispatch('error', {
          type: 'error',
          message: this._xhr?.responseText || '',
          xhrStatus: this._xhr?.status,
          xhrState: this._xhr?.readyState,
        } as SSEErrorEvent);
      };

      if (this.body) {
        this._xhr.send(this.body);
      } else {
        this._xhr.send();
      }

      if (this.timeout > 0) {
        setTimeout(() => {
          if (this._xhr?.readyState === XMLHttpRequest.LOADING) {
            this.dispatch('error', { type: 'timeout' } as SSEErrorEvent);
            this.close();
          }
        }, this.timeout);
      }
    } catch (e) {
      this.status = this.ERROR;
      this.dispatch('error', {
        type: 'exception',
        message: e instanceof Error ? e.message : String(e),
        error: e instanceof Error ? e : new Error(String(e)),
      } as SSEErrorEvent);
    }
  }

  private _logDebug(...msg: unknown[]) {
    if (this.debug) {
      console.debug(...msg);
    }
  }

  private _handleEvent(response: string) {
    if (this.lineEndingCharacter === null) {
      const detectedNewlineChar = this._detectNewlineChar(response);
      if (detectedNewlineChar !== null) {
        this._logDebug(
          `[EventSource] Automatically detected lineEndingCharacter: ${JSON.stringify(
            detectedNewlineChar
          ).slice(1, -1)}`
        );
        this.lineEndingCharacter = detectedNewlineChar;
      } else {
        console.warn(
          "[EventSource] Unable to identify the line ending character. Ensure your server delivers a standard line ending character: \\r\\n, \\n, \\r, or specify your custom character using the 'lineEndingCharacter' option."
        );
        return;
      }
    }

    const indexOfDoubleNewline = this._getLastDoubleNewlineIndex(response);
    if (indexOfDoubleNewline <= this._lastIndexProcessed) {
      return;
    }

    const parts = response
      .substring(this._lastIndexProcessed, indexOfDoubleNewline)
      .split(this.lineEndingCharacter);

    this._lastIndexProcessed = indexOfDoubleNewline;

    let type: string | undefined;
    let id: string | null = null;
    let data: string[] = [];
    let retry = 0;
    let line = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      line = part.trim();
      if (line.startsWith('event')) {
        type = line.replace(/event:?\s*/, '');
      } else if (line.startsWith('retry')) {
        retry = parseInt(line.replace(/retry:?\s*/, ''), 10);
        if (!isNaN(retry)) {
          this.interval = retry;
        }
      } else if (line.startsWith('data')) {
        data.push(line.replace(/data:?\s*/, ''));
      } else if (line.startsWith('id')) {
        id = line.replace(/id:?\s*/, '');
        this.lastEventId = id !== '' ? id : null;
      } else if (line === '') {
        if (data.length > 0) {
          const eventType = type || 'message';
          const event: SSEMessageEvent = {
            type: eventType,
            data: data.join('\n'),
            url: this.url,
            lastEventId: this.lastEventId,
          };

          this.dispatch(eventType, event);

          data = [];
          type = undefined;
        }
      }
    }
  }

  private _detectNewlineChar(response: string): string | null {
    const supportedLineEndings = [this.CRLF, this.LF, this.CR];
    for (const char of supportedLineEndings) {
      if (response.includes(char)) {
        return char;
      }
    }
    return null;
  }

  private _getLastDoubleNewlineIndex(response: string): number {
    const char = this.lineEndingCharacter ?? '';
    const doubleLineEndingCharacter = char + char;
    const lastIndex = response.lastIndexOf(doubleLineEndingCharacter);
    if (lastIndex === -1) {
      return -1;
    }

    return lastIndex + doubleLineEndingCharacter.length;
  }

  addEventListener(type: string, listener: EventHandler) {
    if (this.eventHandlers[type] === undefined) {
      this.eventHandlers[type] = [];
    }
    this.eventHandlers[type].push(listener);
  }

  removeEventListener(type: string, listener: EventHandler) {
    if (this.eventHandlers[type] !== undefined) {
      this.eventHandlers[type] = this.eventHandlers[type].filter(
        (handler) => handler !== listener
      );
    }
  }

  removeAllEventListeners(type?: string) {
    const availableTypes = Object.keys(this.eventHandlers);

    if (type === undefined) {
      for (const eventType of availableTypes) {
        this.eventHandlers[eventType] = [];
      }
    } else {
      if (!availableTypes.includes(type)) {
        throw Error(
          `[EventSource] '${type}' type is not supported event type.`
        );
      }
      this.eventHandlers[type] = [];
    }
  }

  dispatch(type: string, data: SSEMessageEvent | SSEErrorEvent) {
    const handlers = this.eventHandlers[type];
    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(data);
    }
  }

  close() {
    if (this.status !== this.CLOSED) {
      this.status = this.CLOSED;
      this.dispatch('close', { type: 'close' } as SSEMessageEvent);
    }

    if (this._pollTimer !== null) {
      clearTimeout(this._pollTimer);
    }
    if (this._xhr) {
      this._xhr.abort();
    }
  }
}

export interface EventSourceOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  timeoutBeforeConnection?: number;
  pollingInterval?: number;
  withCredentials?: boolean;
  debug?: boolean;
  lineEndingCharacter?: string | null;
}
