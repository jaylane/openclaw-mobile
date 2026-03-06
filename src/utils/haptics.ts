/**
 * Haptic feedback helpers.
 */

import * as Haptics from 'expo-haptics';

export function hapticLight(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticMedium(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function hapticHeavy(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticError(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

export function hapticWarning(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function hapticSelection(): void {
  Haptics.selectionAsync().catch(() => {});
}
