import { useRef, useEffect } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import type { ChatListProps, Message } from '../types';

export function ChatList({
  messages,
  renderMessage,
  renderStreamingIndicator,
  style,
  flatListProps,
}: ChatListProps) {
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return (
    <View style={[styles.container, style]}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderMessage(item)}
        ListFooterComponent={renderStreamingIndicator}
        {...flatListProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
