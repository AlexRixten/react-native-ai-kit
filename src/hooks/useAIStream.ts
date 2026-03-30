import { useState, useRef, useCallback } from 'react';
import { setupEventSource } from '../core/setupEventSource';
import { parseContent } from '../parsers/parseContent';
import { extractTokenUsage } from '../parsers/extractTokenUsage';
import type {
  UseAIStreamConfig,
  UseAIStreamReturn,
  AIStreamStatus,
  TokenUsage,
} from '../types';

export function useAIStream(config: UseAIStreamConfig): UseAIStreamReturn {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<AIStreamStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);

  const eventSourceRef = useRef<ReturnType<typeof setupEventSource> | null>(
    null
  );

  const send = useCallback(
    (body?: Record<string, unknown>) => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;

      setError(null);
      setStatus('connecting');
      setText('');
      setTokenUsage(null);

      const requestBody = body ?? config.body;

      eventSourceRef.current = setupEventSource(
        {
          url: config.url,
          method: config.method,
          headers: config.headers,
          body: requestBody ? JSON.stringify(requestBody) : undefined,
          timeout: config.timeout,
          pollingInterval: 0,
          debug: false,
        },
        {
          onOpen: () => {
            setStatus('streaming');
          },
          onMessage: (_data, parsed) => {
            const content = parseContent(parsed);
            const usage = extractTokenUsage(parsed);

            if (content) {
              setText((prev) => prev + content);
            }

            if (usage) {
              setTokenUsage(usage);
            }

            return { tokens: usage?.totalTokens };
          },
          onComplete: () => {
            setStatus('done');
            eventSourceRef.current = null;
          },
          onError: (errorMessage) => {
            setError(new Error(errorMessage));
            setStatus('error');
            eventSourceRef.current = null;
          },
        }
      );
    },
    [config.url, config.method, config.headers, config.body, config.timeout]
  );

  const abort = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setText('');
    setStatus('idle');
    setError(null);
    setTokenUsage(null);
  }, []);

  return { text, status, error, tokenUsage, send, abort, reset };
}
