/**
 * Zustand store — User preferences.
 * Non-sensitive values stored in AsyncStorage.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'openclaw:settings';

type Theme = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';

interface SettingsState {
  theme: Theme;
  fontSize: FontSize;
  enableHaptics: boolean;
  enableNotifications: boolean;
  enableCamera: boolean;
  enableLocation: boolean;
  voiceSensitivity: number; // 0.0 - 1.0
  loaded: boolean;
}

interface SettingsStore extends SettingsState {
  load: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setFontSize: (size: FontSize) => Promise<void>;
  setHaptics: (enabled: boolean) => Promise<void>;
  setNotifications: (enabled: boolean) => Promise<void>;
  setCamera: (enabled: boolean) => Promise<void>;
  setLocation: (enabled: boolean) => Promise<void>;
  setVoiceSensitivity: (value: number) => Promise<void>;
}

const DEFAULTS: SettingsState = {
  theme: 'system',
  fontSize: 'medium',
  enableHaptics: true,
  enableNotifications: true,
  enableCamera: true,
  enableLocation: true,
  voiceSensitivity: 0.5,
  loaded: false,
};

async function persist(state: Partial<SettingsState>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULTS,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SettingsState>;
        set({ ...DEFAULTS, ...saved, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setTheme: async (theme) => {
    set({ theme });
    await persist({ ...get(), theme });
  },

  setFontSize: async (fontSize) => {
    set({ fontSize });
    await persist({ ...get(), fontSize });
  },

  setHaptics: async (enableHaptics) => {
    set({ enableHaptics });
    await persist({ ...get(), enableHaptics });
  },

  setNotifications: async (enableNotifications) => {
    set({ enableNotifications });
    await persist({ ...get(), enableNotifications });
  },

  setCamera: async (enableCamera) => {
    set({ enableCamera });
    await persist({ ...get(), enableCamera });
  },

  setLocation: async (enableLocation) => {
    set({ enableLocation });
    await persist({ ...get(), enableLocation });
  },

  setVoiceSensitivity: async (voiceSensitivity) => {
    set({ voiceSensitivity });
    await persist({ ...get(), voiceSensitivity });
  },
}));
