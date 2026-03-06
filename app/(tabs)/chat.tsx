import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useChatStore, ChatMessage } from '../../src/store/chat';
import { useGatewayStore } from '../../src/store/gateway';
import { useSettingsStore } from '../../src/store/settings';
import { MessageBubble } from '../../src/ui/MessageBubble';
import { ConnectionBadge } from '../../src/ui/ConnectionBadge';
import { VoiceInput } from '../../src/ui/VoiceInput';
import { Colors, Spacing, Typography, Radius } from '../../src/ui/theme';
import { hapticLight, hapticMedium } from '../../src/utils/haptics';

export default function ChatScreen() {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.theme);
  const colorScheme = themePreference === 'system' ? (systemScheme ?? 'dark') : themePreference;
  const c = Colors[colorScheme];

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const messages = useChatStore((s) =>
    activeSessionId ? (s.messages[activeSessionId] ?? []) : [],
  );
  const streamingMessageId = useChatStore((s) => s.streamingMessageId);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const gatewayState = useGatewayStore((s) => s.state);
  const isConnected = gatewayState === 'connected';

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    if (!isConnected) {
      router.push('/connect');
      return;
    }

    hapticLight();
    setInputText('');
    setSending(true);

    try {
      await sendMessage(text, activeSessionId ?? undefined);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, isConnected, sendMessage, activeSessionId]);

  const handleVoiceTranscription = useCallback((text: string) => {
    setInputText((prev) => prev + (prev ? ' ' : '') + text);
    hapticMedium();
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        colorScheme={colorScheme}
        streamingMessageId={streamingMessageId}
      />
    ),
    [colorScheme, streamingMessageId],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
          {activeSessionId ? `Session ${activeSessionId.slice(0, 8)}…` : 'New Conversation'}
        </Text>
        <ConnectionBadge colorScheme={colorScheme} />
      </View>

      {/* Messages */}
      {!isConnected && messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyIcon]}>🔌</Text>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>Not Connected</Text>
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>
            Connect to a gateway to start chatting
          </Text>
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: c.accent }]}
            onPress={() => router.push('/connect')}
          >
            <Text style={styles.connectButtonText}>Add Gateway</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={[styles.emptyChatText, { color: c.textMuted }]}>
                Send a message to start
              </Text>
            </View>
          }
        />
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.inputBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <VoiceInput
            onTranscription={handleVoiceTranscription}
            colorScheme={colorScheme}
            disabled={!isConnected}
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: c.surfaceElevated,
                borderColor: c.border,
                color: c.textPrimary,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message the agent…"
            placeholderTextColor={c.textMuted}
            multiline
            maxLength={4000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            returnKeyType="send"
            editable={isConnected}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() && isConnected ? c.accent : c.surfaceElevated,
                borderColor: c.border,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending || !isConnected}
          >
            {sending ? (
              <ActivityIndicator size="small" color={c.textPrimary} />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    flex: 1,
  },
  messageList: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.md,
    maxHeight: 120,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  connectButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.md,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyChatText: {
    fontSize: Typography.sizes.md,
  },
});
