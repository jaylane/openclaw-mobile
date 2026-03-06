import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Colors, Spacing, Typography, Radius } from './theme';
import { hapticMedium, hapticLight } from '../utils/haptics';

interface Props {
  onTranscription?: (text: string) => void;
  onAudioReady?: (uri: string) => void;
  colorScheme?: 'dark' | 'light';
  disabled?: boolean;
}

export function VoiceInput({ onTranscription, onAudioReady, colorScheme = 'dark', disabled }: Props) {
  const c = Colors[colorScheme];
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const startRecording = useCallback(async () => {
    if (disabled) return;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Microphone Access', 'Please allow microphone access for voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;

      setIsRecording(true);
      hapticMedium();
      startPulse();
    } catch (err) {
      console.error('[VoiceInput] Failed to start recording:', err);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
    }
  }, [disabled, startPulse]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      setIsRecording(false);
      hapticLight();
      stopPulse();

      if (uri && onAudioReady) {
        onAudioReady(uri);
      }
    } catch (err) {
      console.error('[VoiceInput] Failed to stop recording:', err);
      setIsRecording(false);
      stopPulse();
    }
  }, [stopPulse, onAudioReady]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={disabled}
          style={[
            styles.button,
            {
              backgroundColor: isRecording ? c.error : c.surfaceElevated,
              borderColor: isRecording ? c.error : c.border,
            },
          ]}
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>{isRecording ? '⏹' : '🎤'}</Text>
        </TouchableOpacity>
      </Animated.View>
      {isRecording && (
        <Text style={[styles.hint, { color: c.error }]}>Recording...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
  hint: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
});
