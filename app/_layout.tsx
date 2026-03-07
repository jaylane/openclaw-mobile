import '../src/polyfills'; // Must be first — sets up globalThis.crypto for Hermes
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useGatewayStore } from '../src/store/gateway';
import { useSettingsStore } from '../src/store/settings';
import { registerForPushNotifications } from '../src/node/notifications';
import { Colors } from '../src/ui/theme';

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.theme);
  const loadSettings = useSettingsStore((s) => s.load);
  const loadGateways = useGatewayStore((s) => s.loadGateways);

  const colorScheme =
    themePreference === 'system'
      ? (systemColorScheme ?? 'dark')
      : themePreference;

  const c = Colors[colorScheme];

  useEffect(() => {
    loadSettings();
    loadGateways();
    // Register for push notifications on startup
    registerForPushNotifications().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.background }}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.surface },
            headerTintColor: c.textPrimary,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: c.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="connect"
            options={{
              title: 'Add Gateway',
              presentation: 'modal',
              headerStyle: { backgroundColor: c.surface },
              headerTintColor: c.textPrimary,
            }}
          />
          <Stack.Screen
            name="canvas"
            options={{
              title: 'Canvas',
              headerStyle: { backgroundColor: c.surface },
              headerTintColor: c.textPrimary,
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
