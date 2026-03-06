/**
 * Device identity and challenge signing for OpenClaw Gateway protocol v3.
 *
 * Ed25519 keypair generated once on first launch, stored in iOS Keychain.
 * Device ID = SHA-256 fingerprint of the public key (hex string).
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { V3SigningPayload } from './protocol';

// ─── Keychain Keys ────────────────────────────────────────────────────────────

const KEY_PRIVATE_KEY = 'openclaw:device:privateKey';
const KEY_PUBLIC_KEY = 'openclaw:device:publicKey';
const KEY_DEVICE_ID = 'openclaw:device:id';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeviceIdentity {
  id: string;       // SHA-256 fingerprint of publicKey (hex)
  publicKey: string; // Base64 Ed25519 public key
  // privateKey stays in Keychain, never exported to JS heap beyond signing
}

// ─── Key Generation ───────────────────────────────────────────────────────────

/**
 * Get or create the device identity.
 * On first call, generates an Ed25519 keypair and stores it in the Keychain.
 */
export async function getOrCreateIdentity(): Promise<DeviceIdentity> {
  const storedId = await SecureStore.getItemAsync(KEY_DEVICE_ID);
  const storedPublicKey = await SecureStore.getItemAsync(KEY_PUBLIC_KEY);
  const storedPrivateKey = await SecureStore.getItemAsync(KEY_PRIVATE_KEY);

  if (storedId && storedPublicKey && storedPrivateKey) {
    return { id: storedId, publicKey: storedPublicKey };
  }

  // Generate new keypair using expo-crypto + SubtleCrypto
  const keyPair = await generateEd25519KeyPair();

  // Fingerprint = SHA-256(publicKeyBytes)
  const deviceId = await fingerprintPublicKey(keyPair.publicKeyBase64);

  // Store in Keychain
  await SecureStore.setItemAsync(KEY_PRIVATE_KEY, keyPair.privateKeyBase64, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(KEY_PUBLIC_KEY, keyPair.publicKeyBase64);
  await SecureStore.setItemAsync(KEY_DEVICE_ID, deviceId);

  return { id: deviceId, publicKey: keyPair.publicKeyBase64 };
}

/**
 * Sign a v3 challenge payload with the device's Ed25519 private key.
 * Returns a base64-encoded signature.
 */
export async function signChallenge(payload: V3SigningPayload): Promise<string> {
  const privateKeyBase64 = await SecureStore.getItemAsync(KEY_PRIVATE_KEY);
  if (!privateKeyBase64) {
    throw new Error('No private key found — device identity not initialized');
  }

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const privateKeyBytes = base64ToBytes(privateKeyBase64);

  const cryptoKey = await importEd25519PrivateKey(privateKeyBytes);
  const signatureBytes = await crypto.subtle.sign('Ed25519', cryptoKey, payloadBytes);

  return bytesToBase64(new Uint8Array(signatureBytes));
}

/**
 * Delete stored device identity (for account reset).
 */
export async function deleteIdentity(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_PRIVATE_KEY);
  await SecureStore.deleteItemAsync(KEY_PUBLIC_KEY);
  await SecureStore.deleteItemAsync(KEY_DEVICE_ID);
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

interface KeyPair {
  publicKeyBase64: string;
  privateKeyBase64: string;
}

async function generateEd25519KeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true, // extractable
    ['sign', 'verify'],
  );

  const [publicKeyDer, privateKeyPkcs8] = await Promise.all([
    crypto.subtle.exportKey('raw', keyPair.publicKey),
    crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
  ]);

  return {
    publicKeyBase64: bytesToBase64(new Uint8Array(publicKeyDer)),
    privateKeyBase64: bytesToBase64(new Uint8Array(privateKeyPkcs8)),
  };
}

async function fingerprintPublicKey(publicKeyBase64: string): Promise<string> {
  const bytes = base64ToBytes(publicKeyBase64);
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    bytes,
  );
  // Convert to hex string
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function importEd25519PrivateKey(pkcs8Bytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8Bytes,
    { name: 'Ed25519' },
    false,
    ['sign'],
  );
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
