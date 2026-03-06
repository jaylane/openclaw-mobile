import React, { useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore } from '../../src/store/chat';
import { useGatewayStore } from '../../src/store/gateway';
import { useSettingsStore } from '../../src/store/settings';
import { gatewayClient } from '../../src/gateway/client';
import { Session, SessionsListResult } from '../../src/gateway/protocol';
import { Colors, Spacing, Typography, Radius } from '../../src/ui/theme';
import { hapticLight } from '../../src/utils/haptics';

export default function SessionsScreen() {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.theme);
  const colorScheme = themePreference === 'system' ? (systemScheme ?? 'dark') : themePreference;
  const c = Colors[colorScheme];

  const [loading, setLoading] = React.useState(false);
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const setSessions = useChatStore((s) => s.setSessions);
  const setActiveSession = useChatStore((s) => s.setActiveSession);
  const gatewayState = useGatewayStore((s) => s.state);

  const loadSessions = useCallback(async () => {
    if (gatewayState !== 'connected') return;
    setLoading(true);
    try {
      const result = await gatewayClient.send<SessionsListResult>('sessions.list', {});
      if (result.ok && result.payload) {
        setSessions(result.payload.sessions);
      }
    } catch (err) {
      console.error('[Sessions] Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [gatewayState, setSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSelect = useCallback(
    (session: Session) => {
      hapticLight();
      setActiveSession(session.id);
    },
    [setActiveSession],
  );

  const renderSession = ({ item }: { item: Session }) => {
    const isActive = item.id === activeSessionId;
    return (
      <TouchableOpacity
        style={[
          styles.sessionRow,
          {
            backgroundColor: isActive ? c.accentSubtle : c.surface,
            borderColor: isActive ? c.accent : c.border,
          },
        ]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.75}
      >
        <View style={styles.sessionInfo}>
          <Text style={[styles.sessionTitle, { color: c.textPrimary }]} numberOfLines={1}>
            {item.title ?? `Session ${item.id.slice(0, 8)}`}
          </Text>
          {item.lastMessage && (
            <Text style={[styles.sessionPreview, { color: c.textSecondary }]} numberOfLines={1}>
              {item.lastMessage}
            </Text>
          )}
          <View style={styles.sessionMeta}>
            {item.model && (
              <Text style={[styles.metaTag, { color: c.textMuted, backgroundColor: c.surfaceElevated }]}>
                {item.model}
              </Text>
            )}
            <Text style={[styles.sessionTime, { color: c.textMuted }]}>
              {formatRelativeTime(item.updatedAt)}
            </Text>
          </View>
        </View>
        {isActive && (
          <View style={[styles.activeDot, { backgroundColor: c.accent }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Sessions</Text>
        <TouchableOpacity onPress={loadSessions} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={c.accent} />
          ) : (
            <Text style={[styles.refreshButton, { color: c.accent }]}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {gatewayState !== 'connected' ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            Connect to a gateway to view sessions
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: c.textMuted }]}>
                  No sessions yet
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  },
  refreshButton: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  sessionInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  sessionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  sessionPreview: {
    fontSize: Typography.sizes.sm,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  metaTag: {
    fontSize: Typography.sizes.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  sessionTime: {
    fontSize: Typography.sizes.xs,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: Spacing.md,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
  },
});
