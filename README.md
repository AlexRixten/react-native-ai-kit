# react-native-ai-kit

AI chat toolkit for React Native — SSE streaming, chat hooks, UI components, and parsers for any LLM backend.

## Why

React Native doesn't support the browser `EventSource` API, and there's no comprehensive solution for building AI chat features with streaming responses. `react-native-ai-kit` provides everything in one package:

- SSE client with automatic reconnection
- React hooks for streaming and chat management
- Ready-made UI components
- Parsers for structured data extraction from AI responses

Works with **any LLM backend** — OpenAI, Anthropic, custom APIs. No framework lock-in.

## Requirements

- React Native >= 0.71
- React >= 18

## Installation

```sh
npm install react-native-ai-kit
```

## Quick Start

> **Never hardcode API keys.** Use environment variables or a proxy backend.

```tsx
import { useChat, ChatList, ChatBubble } from 'react-native-ai-kit';

function ChatScreen() {
  const { messages, sendMessage, isStreaming, tokenUsage } = useChat({
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    systemPrompt: 'You are a helpful assistant.',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_KEY}`,
    },
  });

  return (
    <ChatList
      messages={messages}
      renderMessage={(msg) => (
        <ChatBubble
          message={msg}
          variant={msg.role === 'user' ? 'user' : 'assistant'}
        />
      )}
    />
  );
}
```

## Hooks

### `useChat`

High-level hook for chat management. Handles messages, history, streaming, retry, and token tracking.

```tsx
const {
  messages,      // Message[]
  sendMessage,   // (content: string) => void
  isStreaming,   // boolean
  tokenUsage,    // { promptTokens, completionTokens, totalTokens } | null
  retry,         // () => void
  clear,         // () => void
  error,         // Error | null
  stop,          // () => void
} = useChat(config);
```

**Config:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiUrl` | `string` | — | Chat API endpoint |
| `systemPrompt` | `string` | — | System message |
| `headers` | `Record<string, string>` | — | Request headers |
| `model` | `string` | — | LLM model name |
| `initialMessages` | `Message[]` | — | Pre-loaded messages |
| `buildRequestBody` | `(messages) => object` | OpenAI format | Custom request builder |
| `parseResponse` | `(chunk) => string` | OpenAI format | Custom response parser |

### `useAIStream`

Low-level hook for raw SSE streaming. Use when you need more control than `useChat` provides.

```tsx
const {
  text,          // string — accumulated response text
  status,        // 'idle' | 'connecting' | 'streaming' | 'done' | 'error'
  error,         // Error | null
  tokenUsage,    // TokenUsage | null
  send,          // (body?) => void
  abort,         // () => void
  reset,         // () => void
} = useAIStream(config);
```

## Cleanup & Cancellation

`useChat` automatically aborts the SSE connection on component unmount. Call `stop()` to cancel a streaming response manually:

```tsx
<Button onPress={stop} title="Cancel" />
```

## Components

### `ChatList`

Message list with auto-scroll to bottom.

```tsx
<ChatList
  messages={messages}
  renderMessage={(msg) => <ChatBubble message={msg} variant="assistant" />}
  renderStreamingIndicator={() => <ActivityIndicator />}
  style={{ flex: 1 }}
  flatListProps={{ inverted: false }}
/>
```

### `ChatBubble`

Message bubble with user/assistant variants.

```tsx
<ChatBubble
  message={message}
  variant="user"
  renderContent={(text) => <Markdown>{text}</Markdown>}
  showAvatar
/>
```

### `StreamingText`

Text that "types" as tokens arrive. Markdown rendering is deferred until the stream completes to avoid layout jumps.

```tsx
<StreamingText
  text={streamingText}
  showCursor
  renderContent={(text) => <Markdown>{text}</Markdown>}
/>
```

## Parsers

Pure functions for extracting structured data from AI responses. Use outside of React — in utilities, middleware, or custom hooks.

### `parseContent(data)`

Extracts text from OpenAI-style streaming delta.

```ts
parseContent({ choices: [{ delta: { content: 'Hello' } }] })
// => 'Hello'
```

### `extractTokenUsage(data)`

Extracts token counts from the response.

```ts
extractTokenUsage({ usage: { prompt_tokens: 24, completion_tokens: 20, total_tokens: 44 } })
// => { promptTokens: 24, completionTokens: 20, totalTokens: 44 }
```

### `extractJSON(text)`

Extracts JSON from AI response text (fenced code blocks or raw JSON).

```ts
extractJSON('Result: ```json\n{"score": 0.95}\n```')
// => { score: 0.95 }
```

### `extractToolCalls(data)`

Extracts function calling data from OpenAI tool_calls or raw JSON arrays.

```ts
extractToolCalls({ tool_calls: [{ type: 'function', function: { name: 'search', arguments: '{"q":"test"}' } }] })
// => [{ type: 'function', name: 'search', input: { q: 'test' } }]
```

### `extractReasoning(text)`

Separates chain-of-thought reasoning from the main content. Supports `<think />`, `<reasoning />`, and `<thought />` tags.

```ts
// DeepSeek-style format
extractReasoning('<think source="internal">Thinking...</think >Answer: 42.')
// => { reasoning: 'Thinking...', content: 'Answer: 42.' }
```

## Custom Backends

`buildRequestBody` and `parseResponse` let you adapt the hook to any API format:

```tsx
const { messages, sendMessage } = useChat({
  apiUrl: 'https://my-api.com/chat',
  buildRequestBody: (msgs) => ({
    messages: msgs,
    model: 'my-model',
    stream: true,
  }),
  parseResponse: (chunk) => {
    const parsed = JSON.parse(chunk);
    return parsed.result;
  },
  headers: { Authorization: 'Bearer TOKEN' },
});
```

### Using SSE Directly

For maximum control, use `setupEventSource` directly. The `onMessage` callback returns an object with optional `tokens` — this value is used internally to track token usage:

```tsx
import { setupEventSource } from 'react-native-ai-kit';

const es = setupEventSource(
  { url: '/api/stream', headers: { Authorization: 'Bearer TOKEN' } },
  {
    onOpen: () => console.log('Connected'),
    onMessage: (data, parsed) => {
      // Return { tokens } to accumulate usage, or nothing to skip tracking
      return { tokens: parsed.usage?.total_tokens };
    },
    onComplete: (totalTokens) => console.log('Done, tokens:', totalTokens),
    onError: (error) => console.error(error),
  }
);

// Close when done
es.close();
```

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT
