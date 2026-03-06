import React from 'react';
import Markdown from 'react-native-markdown-display';
import { StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from './theme';
import { CodeBlock } from './CodeBlock';

interface Props {
  content: string;
  colorScheme?: 'dark' | 'light';
  fontSize?: number;
}

export function MarkdownRenderer({ content, colorScheme = 'dark', fontSize }: Props) {
  const c = Colors[colorScheme];
  const baseFontSize = fontSize ?? Typography.sizes.md;

  const rules = {
    code_block: (node: any, _children: any, _parent: any, styles: any) => (
      <CodeBlock
        key={node.key}
        code={node.content}
        language={node.sourceInfo ?? undefined}
        colorScheme={colorScheme}
      />
    ),
    fence: (node: any, _children: any, _parent: any, styles: any) => (
      <CodeBlock
        key={node.key}
        code={node.content}
        language={node.sourceInfo ?? undefined}
        colorScheme={colorScheme}
      />
    ),
  };

  return (
    <Markdown
      rules={rules as any}
      style={StyleSheet.create({
        body: {
          color: c.textPrimary,
          fontSize: baseFontSize,
          lineHeight: baseFontSize * 1.6,
        },
        heading1: {
          color: c.textPrimary,
          fontSize: baseFontSize * 1.5,
          fontWeight: Typography.weights.bold,
          marginBottom: Spacing.md,
          marginTop: Spacing.lg,
        },
        heading2: {
          color: c.textPrimary,
          fontSize: baseFontSize * 1.25,
          fontWeight: Typography.weights.semibold,
          marginBottom: Spacing.sm,
          marginTop: Spacing.md,
        },
        heading3: {
          color: c.textPrimary,
          fontSize: baseFontSize * 1.1,
          fontWeight: Typography.weights.semibold,
          marginBottom: Spacing.sm,
          marginTop: Spacing.md,
        },
        paragraph: {
          marginBottom: Spacing.md,
          color: c.textPrimary,
        },
        strong: {
          fontWeight: Typography.weights.bold,
          color: c.textPrimary,
        },
        em: {
          fontStyle: 'italic',
          color: c.textPrimary,
        },
        code_inline: {
          fontFamily: Typography.families.mono,
          fontSize: baseFontSize * 0.9,
          color: c.accent,
          backgroundColor: c.accentSubtle,
          paddingHorizontal: 4,
          paddingVertical: 1,
          borderRadius: 3,
        },
        link: {
          color: c.accent,
          textDecorationLine: 'underline',
        },
        blockquote: {
          borderLeftWidth: 3,
          borderLeftColor: c.accent,
          paddingLeft: Spacing.md,
          opacity: 0.8,
          marginLeft: 0,
          marginBottom: Spacing.md,
        },
        bullet_list: {
          marginBottom: Spacing.md,
        },
        ordered_list: {
          marginBottom: Spacing.md,
        },
        list_item: {
          marginBottom: Spacing.xs,
        },
        hr: {
          backgroundColor: c.border,
          height: 1,
          marginVertical: Spacing.lg,
        },
        table: {
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: Radius.sm,
          marginBottom: Spacing.md,
        },
        th: {
          backgroundColor: c.surfaceElevated,
          padding: Spacing.sm,
          fontWeight: Typography.weights.semibold,
          color: c.textPrimary,
        },
        td: {
          padding: Spacing.sm,
          color: c.textPrimary,
          borderTopWidth: 1,
          borderTopColor: c.border,
        },
      })}
    >
      {content}
    </Markdown>
  );
}
