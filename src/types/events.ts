export interface SSEMessageEvent {
  type: string;
  data: string;
  url: string;
  lastEventId: string | null;
}

export interface SSEErrorEvent {
  type: 'error' | 'timeout' | 'exception';
  message: string;
  xhrStatus?: number;
  xhrState?: number;
  error?: Error;
}

export type SSEEventHandler<T = SSEMessageEvent | SSEErrorEvent> = (
  event: T
) => void;

export type EventSourceStatus = -1 | 0 | 1 | 2;

export const EventSourceStatus = {
  ERROR: -1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSED: 2,
} as const;
