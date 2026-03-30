import { View, Text, StyleSheet } from 'react-native';
import type { ChatBubbleProps } from '../types';

export function ChatBubble({
  message,
  variant,
  renderContent,
  showAvatar = false,
  style,
}: ChatBubbleProps) {
  const isUser = variant === 'user';

  return (
    <View
      style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant, style]}
    >
      {showAvatar && !isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        {renderContent ? (
          renderContent(message.content)
        ) : (
          <Text
            style={[
              styles.text,
              isUser ? styles.textUser : styles.textAssistant,
            ]}
          >
            {message.content}
          </Text>
        )}
      </View>
      {showAvatar && isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  textUser: {
    color: '#FFFFFF',
  },
  textAssistant: {
    color: '#000000',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3C3C43',
  },
});
