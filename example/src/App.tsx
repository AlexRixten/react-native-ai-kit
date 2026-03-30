import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useChat, ChatList, ChatBubble } from 'react-native-ai-kit';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const API_KEY = '';

export default function App() {
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState(API_KEY);
  const cumulativeTokens = useRef(0);
  const lastTotalRef = useRef(0);

  const { messages, sendMessage, isStreaming, tokenUsage, error, stop } =
    useChat({
      apiUrl: API_URL,
      systemPrompt: 'You are a helpful assistant. Keep responses concise.',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
    });

  // Accumulate totalTokens from each completed response
  if (tokenUsage && tokenUsage.totalTokens !== lastTotalRef.current) {
    cumulativeTokens.current += tokenUsage.totalTokens;
    lastTotalRef.current = tokenUsage.totalTokens;
  }

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    sendMessage(text);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>react-native-ai-kit</Text>
        {!apiKey && (
          <TextInput
            style={styles.apiKeyInput}
            placeholder="Enter OpenAI API key..."
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        )}
      </View>

      {/* Token stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Req</Text>
          <Text style={styles.statValue}>
            {messages.filter((m) => m.role === 'user').length}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Resp</Text>
          <Text style={styles.statValue}>
            {messages.filter((m) => m.role === 'assistant').length}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Prompt</Text>
          <Text style={styles.statValue}>
            {tokenUsage?.promptTokens ?? '—'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Complet.</Text>
          <Text style={styles.statValue}>
            {tokenUsage?.completionTokens ?? '—'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={[styles.statValue, styles.statTotal]}>
            {tokenUsage?.totalTokens ?? '—'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>All</Text>
          <Text style={[styles.statValue, styles.statAll]}>
            {cumulativeTokens.current || '—'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <ChatList
        messages={messages}
        style={styles.chatList}
        renderStreamingIndicator={() =>
          isStreaming && !messages[messages.length - 1]?.content ? (
            <View style={styles.streamingRow}>
              <Text style={styles.streamingText}>AI is typing</Text>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : null
        }
        renderMessage={(message) =>
          message.content ? (
            <ChatBubble
              message={message}
              variant={message.role === 'user' ? 'user' : 'assistant'}
            />
          ) : null
        }
      />

      {/* Error */}
      {error && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={input}
          onChangeText={setInput}
          editable={!isStreaming}
          multiline
        />
        {isStreaming ? (
          <TouchableOpacity style={styles.stopButton} onPress={stop}>
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text
              style={[
                styles.sendButtonText,
                !input.trim() && styles.sendButtonDisabled,
              ]}
            >
              Send
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  apiKeyInput: {
    marginTop: 8,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    paddingHorizontal: 10,
    fontSize: 14,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F9F9F9',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statLabel: {
    fontSize: 10,
    color: '#8E8E93',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  statTotal: {
    color: '#007AFF',
  },
  statAll: {
    color: '#34C759',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E5EA',
  },
  chatList: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  streamingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  streamingText: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginRight: 8,
  },
  errorRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FF3B3020',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C7C7CC',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
  },
  sendButton: {
    marginLeft: 8,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  stopButton: {
    marginLeft: 8,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
