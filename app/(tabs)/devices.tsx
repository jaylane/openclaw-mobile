import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGatewayStore } from '../../src/store/gateway';
import { useSettingsStore } from '../../src/store/settings';
import { gatewayClient } from '../../src/gateway/client';
import { PresenceDevice, SystemPresenceResult } from '../../src/gateway/protocol';
import { nodeCapabilities } from '../../src/node/capabilities';
import { Colors, Spacing, Typography, Radius } from '../../src/ui/theme';

export default function DevicesScreen() {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.theme);
  const colorScheme = themePreference === 'system' ? (systemScheme ?? 'dark') : themePreference;
  const c = Colors[colorScheme];

  const [devices, setDevices] = useState<PresenceDevice[]>([]);
  const [loading, setLoading] = useState(false);

  const gatewayState = useGatewayStore((s) => s.state);
  const enableCamera = useSettingsStore((s) => s.enableCamera);
  const enableLocation = useSettingsStore((s) => s.enableLocation);
  const enableNotifications = useSettingsStore((s) => s.enableNotifications);
  const setCamera = useSettingsStore((s) => s.setCamera);
  const setLocation = useSettingsStore((s) => s.setLocation);
  const setNotifications = useSettingsStore((s) => s.setNotifications);

  const loadPresence = useCallback(async () => {
    if (gatewayState !== 'connected') return;
    setLoading(true);
    try {
      const result = await gatewayClient.send<SystemPresenceResult>('system-presence', {});
      if (result.ok && result.payload) {
        setDevices(result.payload.devices);
      }
    } catch (err) {
      console.error('[Devices] Failed to load presence:', err);
    } finally {
      setLoading(false);
    }
  }, [gatewayState]);

  useEffect(() => {
    loadPresence();
  }, [loadPresence]);

  const nodeCommands = nodeCapabilities.registeredCommands;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Devices</Text>
        <TouchableOpacity onPress={loadPresence} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={c.accent} />
          ) : (
            <Text style={[styles.refreshText, { color: c.accent }]}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* This Device Node Status */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>THIS DEVICE (NODE)</Text>

          <View style={styles.capabilityList}>
            {[
              { label: 'Camera', key: 'camera.snap', enabled: enableCamera, toggle: setCamera },
              { label: 'Location', key: 'location.get', enabled: enableLocation, toggle: setLocation },
              { label: 'Notifications', key: 'notifications', enabled: enableNotifications, toggle: setNotifications },
            ].map(({ label, key, enabled, toggle }) => (
              <View
                key={key}
                style={[styles.capabilityRow, { borderBottomColor: c.borderSubtle }]}
              >
                <View>
                  <Text style={[styles.capabilityLabel, { color: c.textPrimary }]}>{label}</Text>
                  <Text style={[styles.capabilityKey, { color: c.textMuted }]}>{key}</Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={toggle}
                  trackColor={{ false: c.border, true: c.accent }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>

          <View style={styles.commandsSection}>
            <Text style={[styles.commandsLabel, { color: c.textMuted }]}>
              Registered commands: {nodeCommands.join(', ')}
            </Text>
          </View>
        </View>

        {/* Connected Devices */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>CONNECTED DEVICES</Text>

          {gatewayState !== 'connected' ? (
            <Text style={[styles.notConnectedText, { color: c.textMuted }]}>
              Connect to a gateway to see devices
            </Text>
          ) : devices.length === 0 ? (
            <Text style={[styles.notConnectedText, { color: c.textMuted }]}>
              No other devices connected
            </Text>
          ) : (
            devices.map((device) => (
              <View
                key={device.id}
                style={[styles.deviceRow, { borderBottomColor: c.borderSubtle }]}
              >
                <View style={[styles.deviceDot, { backgroundColor: c.success }]} />
                <View style={styles.deviceInfo}>
                  <Text style={[styles.deviceId, { color: c.textPrimary }]}>
                    {device.id.slice(0, 12)}…
                  </Text>
                  <Text style={[styles.deviceMeta, { color: c.textMuted }]}>
                    {[device.platform, device.role].filter(Boolean).join(' · ')}
                  </Text>
                  {device.caps && device.caps.length > 0 && (
                    <Text style={[styles.deviceCaps, { color: c.textMuted }]}>
                      {device.caps.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  refreshText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  capabilityList: {},
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  capabilityLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  capabilityKey: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Courier New',
    marginTop: 2,
  },
  commandsSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  commandsLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Courier New',
  },
  notConnectedText: {
    fontSize: Typography.sizes.md,
    padding: Spacing.lg,
    textAlign: 'center',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  deviceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceId: {
    fontSize: Typography.sizes.md,
    fontFamily: 'Courier New',
    fontWeight: Typography.weights.medium,
  },
  deviceMeta: {
    fontSize: Typography.sizes.sm,
  },
  deviceCaps: {
    fontSize: Typography.sizes.xs,
  },
});
