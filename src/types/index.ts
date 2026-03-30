import type { ReactNode } from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import type { FlatListProps } from 'react-native';

// --- Message ---

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  structuredData?: unknown;
  createdAt: Date;
}

// --- useAIStream ---

export type AIStreamStatus =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'done'
  | 'error';

export interface UseAIStreamConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  reconnect?: boolean;
  reconnectInterval?: number;
  timeout?: number;
}

export interface UseAIStreamReturn {
  text: string;
  status: AIStreamStatus;
  error: Error | null;
  tokenUsage: TokenUsage | null;
  send: (body?: Record<string, unknown>) => void;
  abort: () => void;
  reset: () => void;
}

// --- useChat ---

export interface UseChatConfig {
  apiUrl: string;
  systemPrompt?: string;
  headers?: Record<string, string>;
  model?: string;
  initialMessages?: Message[];
  buildRequestBody?: (
    messages: { role: string; content: string }[]
  ) => Record<string, unknown>;
  parseResponse?: (chunk: string) => string;
}

export interface UseChatReturn {
  messages: Message[];
  sendMessage: (content: string) => void;
  isStreaming: boolean;
  tokenUsage: TokenUsage | null;
  retry: () => void;
  clear: () => void;
  error: Error | null;
  stop: () => void;
}

// --- Components ---

export interface ChatListProps {
  messages: Message[];
  renderMessage: (message: Message) => ReactNode;
  renderStreamingIndicator?: () => ReactNode;
  style?: ViewStyle;
  flatListProps?: Partial<FlatListProps<Message>>;
}

export interface ChatBubbleProps {
  message: Message;
  variant: 'user' | 'assistant';
  renderContent?: (content: string) => ReactNode;
  showAvatar?: boolean;
  style?: ViewStyle;
}

export interface StreamingTextProps {
  text: string;
  showCursor?: boolean;
  renderContent?: (text: string) => ReactNode;
  style?: TextStyle;
}

// --- Parsers ---

export interface ToolCall {
  type: string;
  name: string;
  input: Record<string, unknown>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
