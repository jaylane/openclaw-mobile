import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Clipboard,
  Alert,
} from 'react-native';
import { ChatMessage } from '../store/chat';
import { Colors, Spacing, Typography, Radius } from './theme';
import { StreamingText } from './StreamingText';
import { MarkdownRenderer } from './MarkdownRenderer';
import { hapticLight } from '../utils/haptics';

interface Props {
  message: ChatMessage;
  colorScheme?: 'dark' | 'light';
  streamingMessageId?: string | null;
}

export function MessageBubble({ message, colorScheme = 'dark', streamingMessageId }: Props) {
  const c = Colors[colorScheme];
  const isUser = message.role === 'user';
  const isStreaming = message.id === streamingMessageId;

  const handleLongPress = () => {
    hapticLight();
    Alert.alert('Message', undefined, [
      {
        text: 'Copy',
        onPress: () => {
          Clipboard.setString(message.content);
          hapticLight();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const statusIcon = {
    sending: '⏳',
    sent: '✓',
    streaming: '',
    complete: '',
    error: '⚠️',
  }[message.status];

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      activeOpacity={0.85}
      style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: c.userBubble }]
            : [styles.assistantBubble, { backgroundColor: c.assistantBubble, borderColor: c.border }],
        ]}
      >
        {isUser ? (
          <Text style={[styles.userText, { color: c.userBubbleText }]} selectable>
            {message.content}
          </Text>
        ) : (
          <StreamingText
            content={message.content}
            isStreaming={isStreaming}
            colorScheme={colorScheme}
          />
        )}

        <View style={styles.meta}>
          <Text style={[styles.timestamp, { color: isUser ? c.accentSubtle : c.textMuted }]}>
            {formatTime(message.createdAt)}
          </Text>
          {isUser && statusIcon ? (
            <Text style={[styles.status, { color: message.status === 'error' ? c.error : c.textMuted }]}>
              {statusIcon}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  userBubble: {
    borderBottomRightRadius: Radius.sm,
  },
  assistantBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: Radius.sm,
  },
  userText: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.5,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: Typography.sizes.xs,
  },
  status: {
    fontSize: 10,
  },
});
