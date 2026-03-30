import { useState, useCallback, useRef, useEffect } from 'react';
import { useAIStream } from './useAIStream';
import type { Message, UseChatConfig, UseChatReturn } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface ChatRequestMessage {
  role: string;
  content: string;
}

function defaultBuildRequestBody(
  messages: ChatRequestMessage[],
  model?: string
): Record<string, unknown> {
  return {
    model: model || 'gpt-4',
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
    stream_options: {
      include_usage: true,
    },
  };
}

export function useChat(config: UseChatConfig): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>(
    config.initialMessages ?? []
  );

  const { text, status, error, tokenUsage, send, abort, reset } = useAIStream({
    url: config.apiUrl,
    method: 'POST',
    headers: config.headers,
    timeout: undefined,
  });

  const isStreaming = status === 'streaming' || status === 'connecting';
  const streamingIdRef = useRef<string | null>(null);

  // Update streaming message content in-place as tokens arrive
  useEffect(() => {
    const id = streamingIdRef.current;
    if (id && status === 'streaming' && text) {
      setMessages((prev: Message[]) =>
        prev.map((m) => (m.id === id ? { ...m, content: text } : m))
      );
    }
  }, [text, status]);

  const sendMessage = useCallback(
    (content: string) => {
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        createdAt: new Date(),
      };

      const assistantId = generateId();
      streamingIdRef.current = assistantId;

      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };

      setMessages((prev: Message[]) => [
        ...prev,
        userMessage,
        assistantMessage,
      ]);

      const systemMessages = config.systemPrompt
        ? [{ role: 'system' as const, content: config.systemPrompt }]
        : [];

      const allMessages = [...systemMessages, ...messages, userMessage];

      const body = config.buildRequestBody
        ? config.buildRequestBody(allMessages)
        : defaultBuildRequestBody(allMessages, config.model);

      send(body);
    },
    [config, messages, send]
  );

  const retry = useCallback(() => {
    setMessages((prev: Message[]) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') {
        return prev.slice(0, -1);
      }
      return prev;
    });
    streamingIdRef.current = null;
    reset();

    const lastUserMessage = [...messages]
      .reverse()
      .find((m: Message) => m.role === 'user');
    if (lastUserMessage) {
      const lastAssistantIdx = messages.findLastIndex(
        (m: Message) => m.role === 'assistant'
      );
      const messagesWithoutLastAssistant =
        lastAssistantIdx >= 0 ? messages.slice(0, lastAssistantIdx) : messages;

      const systemMessages = config.systemPrompt
        ? [{ role: 'system' as const, content: config.systemPrompt }]
        : [];
      const allMessages = [...systemMessages, ...messagesWithoutLastAssistant];

      const body = config.buildRequestBody
        ? config.buildRequestBody(allMessages)
        : defaultBuildRequestBody(allMessages, config.model);

      setTimeout(() => send(body), 0);
    }
  }, [messages, config, reset, send]);

  const clear = useCallback(() => {
    reset();
    setMessages([]);
    streamingIdRef.current = null;
  }, [reset]);

  const stop = useCallback(() => {
    streamingIdRef.current = null;
    abort();
  }, [abort]);

  return {
    messages,
    sendMessage,
    isStreaming,
    tokenUsage,
    retry,
    clear,
    error,
    stop,
  };
}
