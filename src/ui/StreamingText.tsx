import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Colors } from './theme';

interface Props {
  content: string;
  isStreaming: boolean;
  colorScheme?: 'dark' | 'light';
  fontSize?: number;
}

export function StreamingText({ content, isStreaming, colorScheme = 'dark', fontSize }: Props) {
  const c = Colors[colorScheme];
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isStreaming) {
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
      cursorOpacity.setValue(0);
    }

    return () => {
      animRef.current?.stop();
    };
  }, [isStreaming, cursorOpacity]);

  return (
    <View style={styles.container}>
      <MarkdownRenderer content={content} colorScheme={colorScheme} fontSize={fontSize} />
      {isStreaming && (
        <Animated.View
          style={[styles.cursor, { backgroundColor: c.accent, opacity: cursorOpacity }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
  },
  cursor: {
    width: 2,
    height: 16,
    marginLeft: 1,
    borderRadius: 1,
    alignSelf: 'flex-end',
  },
});
