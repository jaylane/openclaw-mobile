import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useGatewayStore } from '../src/store/gateway';
import { useSettingsStore } from '../src/store/settings';
import { Colors, Spacing, Typography, Radius } from '../src/ui/theme';
import { hapticSuccess, hapticError } from '../src/utils/haptics';
import { generateUUID } from '../src/utils/crypto';
import { GatewayClient } from '../src/gateway/client';
import { SavedGateway } from '../src/store/secure';

export default function ConnectScreen() {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.theme);
  const colorScheme = themePreference === 'system' ? (systemScheme ?? 'dark') : themePreference;
  const c = Colors[colorScheme];

  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [testError, setTestError] = useState('');

  const addGateway = useGatewayStore((s) => s.addGateway);
  const connectToGateway = useGatewayStore((s) => s.connectToGateway);

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) {
      return `wss://${trimmed}`;
    }
    return trimmed;
  };

  const handleTest = useCallback(async () => {
    const wsUrl = normalizeUrl(url);
    setTesting(true);
    setTestResult(null);
    setTestError('');

    try {
      // Quick connectivity test — try to open a WebSocket
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout after 10s'));
        }, 10_000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close(1000);
          resolve();
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection failed'));
        };

        ws.onclose = (event) => {
          if (event.code === 1000) return; // normal close after our onopen
          clearTimeout(timeout);
          reject(new Error(`Closed: code=${event.code} ${event.reason ?? ''}`));
        };
      });

      setTestResult('ok');
      hapticSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult('fail');
      setTestError(msg);
      hapticError();
    } finally {
      setTesting(false);
    }
  }, [url]);

  const handleSave = useCallback(async () => {
    const wsUrl = normalizeUrl(url);
    if (!wsUrl) {
      Alert.alert('Error', 'Please enter a gateway URL');
      return;
    }

    const gateway: SavedGateway = {
      id: generateUUID(),
      url: wsUrl,
      name: name.trim() || new URL(wsUrl.replace('ws://', 'http://').replace('wss://', 'https://')).hostname,
      token: token.trim() || undefined,
    };

    setConnecting(true);
    try {
      await addGateway(gateway);
      await connectToGateway(gateway);
      hapticSuccess();
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      hapticError();
      Alert.alert('Connection Failed', msg);
    } finally {
      setConnecting(false);
    }
  }, [url, name, token, addGateway, connectToGateway]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: c.textPrimary }]}>Connect to Gateway</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Enter the WebSocket URL of your OpenClaw Gateway
          </Text>

          {/* URL */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Gateway URL</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceElevated, borderColor: c.border, color: c.textPrimary }]}
              value={url}
              onChangeText={setUrl}
              placeholder="wss://your-gateway.example.com"
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Display Name (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceElevated, borderColor: c.border, color: c.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="My Gateway"
              placeholderTextColor={c.textMuted}
            />
          </View>

          {/* Token */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Auth Token (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceElevated, borderColor: c.border, color: c.textPrimary }]}
              value={token}
              onChangeText={setToken}
              placeholder="gateway-token"
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={[styles.fieldHint, { color: c.textMuted }]}>
              Leave blank if using device-key-only auth
            </Text>
          </View>

          {/* Test Result */}
          {testResult && (
            <View
              style={[
                styles.testResult,
                {
                  backgroundColor: testResult === 'ok' ? c.errorSubtle.replace('ff4d6a', '4dffaa') : c.errorSubtle,
                  borderColor: testResult === 'ok' ? c.success : c.error,
                },
              ]}
            >
              <Text style={{ color: testResult === 'ok' ? c.success : c.error, fontWeight: Typography.weights.medium }}>
                {testResult === 'ok' ? '✓ Connection successful' : `✕ ${testError}`}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.testBtn, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}
              onPress={handleTest}
              disabled={!url.trim() || testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color={c.accent} />
              ) : (
                <Text style={[styles.testBtnText, { color: c.textPrimary }]}>Test Connection</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: url.trim() ? c.accent : c.surfaceElevated }]}
              onPress={handleSave}
              disabled={!url.trim() || connecting}
            >
              {connecting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.saveBtnText, { color: url.trim() ? '#fff' : c.textMuted }]}>
                  Save & Connect
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Protocol Note */}
          <View style={[styles.note, { backgroundColor: c.accentSubtle, borderColor: c.accent }]}>
            <Text style={[styles.noteText, { color: c.textSecondary }]}>
              Uses OpenClaw Gateway Protocol v3 with Ed25519 device authentication.
              Your device key is generated locally and stored in the iOS Keychain.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.md,
  },
  fieldHint: {
    fontSize: Typography.sizes.xs,
  },
  testResult: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  actions: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  testBtn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  testBtnText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  saveBtn: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  saveBtnText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  note: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  noteText: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
});
