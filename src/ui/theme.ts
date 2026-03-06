/**
 * Color tokens, spacing, typography for OpenClaw Mobile.
 */

export const Colors = {
  dark: {
    background: '#0a0a0f',
    surface: '#13131a',
    surfaceElevated: '#1c1c26',
    border: '#2a2a3a',
    borderSubtle: '#1e1e2e',

    textPrimary: '#e8e8f0',
    textSecondary: '#8888a8',
    textMuted: '#555570',

    accent: '#5c6fff',
    accentHover: '#4a5cff',
    accentSubtle: 'rgba(92, 111, 255, 0.15)',

    userBubble: '#1e2246',
    userBubbleText: '#c8d0ff',
    assistantBubble: '#13131a',
    assistantBubbleText: '#e8e8f0',

    error: '#ff4d6a',
    errorSubtle: 'rgba(255, 77, 106, 0.15)',
    warning: '#ffaa4d',
    success: '#4dffaa',

    iconDefault: '#6666a0',
    iconActive: '#5c6fff',

    tabBar: '#0e0e18',
    tabBarActive: '#5c6fff',
    tabBarInactive: '#444466',
  },
  light: {
    background: '#f5f5fa',
    surface: '#ffffff',
    surfaceElevated: '#f0f0f8',
    border: '#d8d8e8',
    borderSubtle: '#ebebf5',

    textPrimary: '#1a1a2e',
    textSecondary: '#5555a0',
    textMuted: '#9999c0',

    accent: '#4a5cff',
    accentHover: '#3a4cef',
    accentSubtle: 'rgba(74, 92, 255, 0.1)',

    userBubble: '#4a5cff',
    userBubbleText: '#ffffff',
    assistantBubble: '#ffffff',
    assistantBubbleText: '#1a1a2e',

    error: '#e0003a',
    errorSubtle: 'rgba(224, 0, 58, 0.1)',
    warning: '#cc7700',
    success: '#008844',

    iconDefault: '#8888b0',
    iconActive: '#4a5cff',

    tabBar: '#ffffff',
    tabBarActive: '#4a5cff',
    tabBarInactive: '#9999c0',
  },
} as const;

export type ColorScheme = 'dark' | 'light';
export type ThemeColors = (typeof Colors)['dark'];

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Typography = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  families: {
    sans: 'System',
    mono: 'Courier New',
  },
} as const;

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;
