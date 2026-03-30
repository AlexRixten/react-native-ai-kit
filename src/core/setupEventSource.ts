import EventSource from './EventSource';
import type { EventSourceOptions } from './EventSource';
import type { SSEMessageEvent } from '../types/events';

export interface SetupEventSourceOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  pollingInterval?: number;
  debug?: boolean;
}

export interface EventSourceCallbacks {
  onOpen?: () => void;
  onMessage?: (
    data: string,
    parsed: unknown
  ) => { content?: string; tokens?: number } | void;
  onComplete?: (tokensUsed: number) => void;
  onError?: (error: string) => void;
}

/**
 * Creates and configures an EventSource instance with standard SSE handlers.
 *
 * The returned EventSource can be closed externally via `es.close()` —
 * the timeout is always cleaned up via the 'close' event listener.
 *
 * @example
 * ```ts
 * const es = setupEventSource(
 *   { url: '/api/stream', headers: { Authorization: 'Bearer ...' } },
 *   {
 *     onOpen: () => console.log('Connected'),
 *     onMessage: (data, parsed) => {
 *       const content = parsed.choices?.[0]?.delta?.content;
 *       const tokens = parsed.usage?.total_tokens;
 *       return { content, tokens };
 *     },
 *     onComplete: (tokens) => console.log('Done:', tokens),
 *     onError: (error) => console.error(error),
 *   }
 * );
 * ```
 */
export function setupEventSource(
  options: SetupEventSourceOptions,
  callbacks: EventSourceCallbacks
): EventSource {
  const {
    url,
    method = 'POST',
    headers,
    body,
    timeout = 60000,
    pollingInterval = 0,
    debug = false,
  } = options;

  let isRequestActive = true;
  let totalTokens = 0;

  const completeRequest = () => {
    isRequestActive = false;
  };

  const esOptions: EventSourceOptions = {
    method,
    headers,
    body,
    pollingInterval,
    debug,
  };

  const es = new EventSource(url, esOptions);

  // Timeout — fires if server never responds
  const timeoutId = setTimeout(() => {
    if (isRequestActive) {
      console.warn('[Stream] Request timeout');
      completeRequest();
      callbacks.onError?.('Request timed out');
      es.close();
    }
  }, timeout);

  // Always clean up timeout when connection closes —
  // covers both internal ([DONE], error) and external (stopStream) close
  es.addEventListener('close', () => {
    completeRequest();
    clearTimeout(timeoutId);
  });

  es.addEventListener('open', () => {
    if (debug) {
      console.log('[Stream] Connection opened');
    }
    callbacks.onOpen?.();
  });

  es.addEventListener('message', (event) => {
    const msgEvent = event as SSEMessageEvent;
    if (debug) {
      console.log('[Stream] Raw data:', msgEvent.data);
    }

    if (msgEvent.data === '[DONE]') {
      if (debug) {
        console.log('[Stream] Stream complete');
      }
      completeRequest();
      clearTimeout(timeoutId);
      callbacks.onComplete?.(totalTokens);
      es.close();
      return;
    }

    try {
      const parsed: unknown = JSON.parse(msgEvent.data);
      if (debug) {
        console.log('[Stream] Parsed JSON:', parsed);
      }

      const result = callbacks.onMessage?.(msgEvent.data, parsed);

      if (result?.tokens !== undefined) {
        totalTokens = result.tokens;
      }
    } catch (err) {
      console.error('[Stream] Parse error:', err);
      callbacks.onMessage?.(msgEvent.data, msgEvent.data);
    }
  });

  es.addEventListener('error', (event: unknown) => {
    const errorMsg =
      typeof event === 'object' && event !== null && 'type' in event
        ? String((event as { type: unknown }).type)
        : 'unknown error';

    console.error('[Stream] Error:', errorMsg);

    completeRequest();
    clearTimeout(timeoutId);

    let errorMessage = 'Connection failed. ';
    if (errorMsg.includes('401') || errorMsg.includes('auth')) {
      errorMessage += 'Authentication failed. Check your token.';
    } else if (errorMsg.includes('429') || errorMsg.includes('rate')) {
      errorMessage += 'Rate limit exceeded.';
    } else if (errorMsg.includes('timeout')) {
      errorMessage += 'Request timed out.';
    } else {
      errorMessage += errorMsg;
    }

    callbacks.onError?.(errorMessage);
    es.close();
  });

  return es;
}
