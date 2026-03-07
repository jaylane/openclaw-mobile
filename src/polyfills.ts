/**
 * Polyfills that must load before any app code.
 * Import this at the very top of app/_layout.tsx.
 */

import QuickCrypto from 'react-native-quick-crypto';

// Hermes doesn't provide globalThis.crypto — wire up react-native-quick-crypto
if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error — QuickCrypto is a superset but not a perfect typedef match
  globalThis.crypto = QuickCrypto;
} else if (typeof globalThis.crypto.subtle === 'undefined') {
  // crypto exists (e.g. getRandomValues) but no subtle — patch it in
  // @ts-expect-error — same typedef mismatch
  globalThis.crypto.subtle = QuickCrypto.subtle;
}
