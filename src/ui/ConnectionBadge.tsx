import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useGatewayStore } from '../store/gateway';
import { Colors, Spacing, Typography, Radius } from './theme';

interface Props {
  colorScheme?: 'dark' | 'light';
}

export function ConnectionBadge({ colorScheme = 'dark' }: Props) {
  const state = useGatewayStore((s) => s.state);
  const c = Colors[colorScheme];

  const config = {
    disconnected: { label: 'Disconnected', color: c.error, dot: true },
    connecting: { label: 'Connecting', color: c.warning, dot: false },
    challenged: { label: 'Authenticating', color: c.warning, dot: false },
    connected: { label: 'Connected', color: c.success, dot: true },
  }[state];

  return (
    <View style={[styles.badge, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
      {config.dot ? (
        <View style={[styles.dot, { backgroundColor: config.color }]} />
      ) : (
        <ActivityIndicator size="small" color={config.color} style={styles.spinner} />
      )}
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  spinner: {
    width: 12,
    height: 12,
    transform: [{ scale: 0.6 }],
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
});
