import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Clipboard,
} from 'react-native';
import { Colors, Spacing, Typography, Radius } from './theme';
import { hapticLight } from '../utils/haptics';

interface Props {
  code: string;
  language?: string;
  colorScheme?: 'dark' | 'light';
}

export function CodeBlock({ code, language, colorScheme = 'dark' }: Props) {
  const [copied, setCopied] = useState(false);
  const c = Colors[colorScheme];

  const handleCopy = () => {
    Clipboard.setString(code);
    hapticLight();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Text style={[styles.language, { color: c.textMuted }]}>
          {language ?? 'code'}
        </Text>
        <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
          <Text style={[styles.copyText, { color: copied ? c.success : c.textSecondary }]}>
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text
          style={[
            styles.code,
            { color: c.textPrimary, fontFamily: Typography.families.mono },
          ]}
          selectable
        >
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  language: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.families.mono,
  },
  copyButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  copyText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  code: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    padding: Spacing.md,
  },
});
