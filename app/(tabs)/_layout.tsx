import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, Platform } from 'react-native';
import { useSettingsStore } from '../../src/store/settings';
import { Colors } from '../../src/ui/theme';

export default function TabsLayout() {
  const systemColorScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.theme);

  const colorScheme =
    themePreference === 'system'
      ? (systemColorScheme ?? 'dark')
      : themePreference;

  const c = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.tabBarActive,
        tabBarInactiveTintColor: c.tabBarInactive,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.border,
          borderTopWidth: 1,
        },
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <TabIcon emoji="💬" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color }) => <TabIcon emoji="🗂" color={color} />,
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarIcon: ({ color }) => <TabIcon emoji="📡" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const React = require('react');
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, opacity: color ? 1 : 0.5 }}>{emoji}</Text>;
}
