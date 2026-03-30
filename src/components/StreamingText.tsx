import { Text, StyleSheet } from 'react-native';
import type { StreamingTextProps } from '../types';

export function StreamingText({
  text,
  showCursor = true,
  renderContent,
  style,
}: StreamingTextProps) {
  if (renderContent) {
    return <>{renderContent(text)}</>;
  }

  return (
    <Text style={[styles.text, style]}>
      {text}
      {showCursor && <Text style={styles.cursor}> </Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  cursor: {
    color: '#007AFF',
  },
});
