/**
 * Crypto utilities — re-exports from auth module + standalone helpers.
 */

export { bytesToBase64, base64ToBytes } from '../gateway/auth';

/**
 * Generate a random UUID v4.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Simple hash for non-security uses (display IDs, etc).
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32-bit int
  }
  return Math.abs(hash).toString(16);
}
