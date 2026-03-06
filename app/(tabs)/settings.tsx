import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useGatewayStore } from '../../src/store/gateway';
import { useSettingsStore } from '../../src/store/settings';
import { Colors, Spacing, Typography, Radius } from '../../src/ui/theme';
import { ConnectionBadge } from '../../src/ui/ConnectionBadge';
import { hapticLight } from '../../src/utils/haptics';

export default function SettingsScreen() {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.theme);
  const colorScheme = themePreference === 'system' ? (systemScheme ?? 'dark') : themePreference;
  const c = Colors[colorScheme];

  const settings = useSettingsStore();
  const gateways = useGatewayStore((s) => s.gateways);
  const activeGatewayId = useGatewayStore((s) => s.activeGatewayId);
  const connectToGateway = useGatewayStore((s) => s.connectToGateway);
  const deleteGateway = useGatewayStore((s) => s.deleteGateway);
  const disconnect = useGatewayStore((s) => s.disconnect);

  const handleDeleteGateway = (gatewayId: string, name: string) => {
    Alert.alert(
      'Remove Gateway',
      `Remove "${name}"? Stored tokens will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            hapticLight();
            deleteGateway(gatewayId);
          },
        },
      ],
    );
  };

  const SettingRow = ({
    label,
    value,
    onPress,
    rightElement,
    subtitle,
  }: {
    label: string;
    value?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    subtitle?: string;
  }) => (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: c.borderSubtle }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <Text style={[styles.settingLabel, { color: c.textPrimary }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: c.textMuted }]}>{subtitle}</Text>
        )}
      </View>
      {rightElement ?? (
        value && <Text style={[styles.settingValue, { color: c.textSecondary }]}>{value}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Settings</Text>
        <ConnectionBadge colorScheme={colorScheme} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Gateways */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>GATEWAYS</Text>

          {gateways.map((gateway) => (
            <View key={gateway.id} style={[styles.gatewayRow, { borderBottomColor: c.borderSubtle }]}>
              <View style={styles.gatewayInfo}>
                {gateway.id === activeGatewayId && (
                  <View style={[styles.activeIndicator, { backgroundColor: c.success }]} />
                )}
                <View>
                  <Text style={[styles.gatewayName, { color: c.textPrimary }]}>{gateway.name}</Text>
                  <Text style={[styles.gatewayUrl, { color: c.textMuted }]}>{gateway.url}</Text>
                </View>
              </View>
              <View style={styles.gatewayActions}>
                {gateway.id !== activeGatewayId && (
                  <TouchableOpacity
                    onPress={() => connectToGateway(gateway)}
                    style={[styles.gatewayActionBtn, { borderColor: c.accent }]}
                  >
                    <Text style={[styles.gatewayActionText, { color: c.accent }]}>Connect</Text>
                  </TouchableOpacity>
                )}
                {gateway.id === activeGatewayId && (
                  <TouchableOpacity
                    onPress={() => disconnect()}
                    style={[styles.gatewayActionBtn, { borderColor: c.error }]}
                  >
                    <Text style={[styles.gatewayActionText, { color: c.error }]}>Disconnect</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleDeleteGateway(gateway.id, gateway.name)}
                  style={styles.deleteBtn}
                >
                  <Text style={[styles.deleteText, { color: c.error }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addGatewayBtn, { borderColor: c.accent }]}
            onPress={() => router.push('/connect')}
          >
            <Text style={[styles.addGatewayText, { color: c.accent }]}>+ Add Gateway</Text>
          </TouchableOpacity>
        </View>

        {/* Node Permissions */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>NODE PERMISSIONS</Text>
          <SettingRow
            label="Camera"
            subtitle="Allow gateway to snap photos"
            rightElement={
              <Switch
                value={settings.enableCamera}
                onValueChange={settings.setCamera}
                trackColor={{ false: c.border, true: c.accent }}
                thumbColor="#fff"
              />
            }
          />
          <SettingRow
            label="Location"
            subtitle="Allow gateway to read GPS"
            rightElement={
              <Switch
                value={settings.enableLocation}
                onValueChange={settings.setLocation}
                trackColor={{ false: c.border, true: c.accent }}
                thumbColor="#fff"
              />
            }
          />
          <SettingRow
            label="Notifications"
            subtitle="Receive alerts when backgrounded"
            rightElement={
              <Switch
                value={settings.enableNotifications}
                onValueChange={settings.setNotifications}
                trackColor={{ false: c.border, true: c.accent }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Appearance */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>APPEARANCE</Text>
          {(['system', 'dark', 'light'] as const).map((theme) => (
            <SettingRow
              key={theme}
              label={theme.charAt(0).toUpperCase() + theme.slice(1)}
              onPress={() => settings.setTheme(theme)}
              rightElement={
                <Text style={{ color: settings.theme === theme ? c.accent : c.textMuted }}>
                  {settings.theme === theme ? '✓' : ''}
                </Text>
              }
            />
          ))}
        </View>

        {/* Haptics */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>FEEDBACK</Text>
          <SettingRow
            label="Haptics"
            rightElement={
              <Switch
                value={settings.enableHaptics}
                onValueChange={settings.setHaptics}
                trackColor={{ false: c.border, true: c.accent }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>ABOUT</Text>
          <SettingRow label="Version" value="0.1.0" />
          <SettingRow label="License" value="MIT" />
          <SettingRow
            label="GitHub"
            value="openclaw/openclaw-mobile"
            onPress={() => Linking.openURL('https://github.com/openclaw/openclaw-mobile')}
          />
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: { flex: 1, gap: 2 },
  settingLabel: { fontSize: Typography.sizes.md },
  settingSubtitle: { fontSize: Typography.sizes.xs },
  settingValue: { fontSize: Typography.sizes.md },
  gatewayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gatewayInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gatewayName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  gatewayUrl: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Courier New',
  },
  gatewayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gatewayActionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  gatewayActionText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  deleteBtn: {
    padding: Spacing.sm,
  },
  deleteText: {
    fontSize: Typography.sizes.md,
  },
  addGatewayBtn: {
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addGatewayText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
});
