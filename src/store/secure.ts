/**
 * Keychain wrapper for tokens and secrets.
 * Never use AsyncStorage for sensitive values.
 */

import * as SecureStore from 'expo-secure-store';

const KEY_GATEWAY_TOKEN = 'openclaw:gateway:token';
const KEY_DEVICE_TOKEN = 'openclaw:device:token';
const KEY_SAVED_GATEWAYS = 'openclaw:gateways';

export interface SavedGateway {
  id: string;
  url: string;
  name: string;
  token?: string;
  lastConnected?: number;
}

// ─── Gateway Token ─────────────────────────────────────────────────────────

export async function saveGatewayToken(gatewayId: string, token: string): Promise<void> {
  await SecureStore.setItemAsync(`${KEY_GATEWAY_TOKEN}:${gatewayId}`, token);
}

export async function getGatewayToken(gatewayId: string): Promise<string | null> {
  return SecureStore.getItemAsync(`${KEY_GATEWAY_TOKEN}:${gatewayId}`);
}

export async function deleteGatewayToken(gatewayId: string): Promise<void> {
  await SecureStore.deleteItemAsync(`${KEY_GATEWAY_TOKEN}:${gatewayId}`);
}

// ─── Device Token (issued by gateway on first pair) ───────────────────────

export async function saveDeviceToken(gatewayId: string, token: string): Promise<void> {
  await SecureStore.setItemAsync(`${KEY_DEVICE_TOKEN}:${gatewayId}`, token);
}

export async function getDeviceToken(gatewayId: string): Promise<string | null> {
  return SecureStore.getItemAsync(`${KEY_DEVICE_TOKEN}:${gatewayId}`);
}

export async function deleteDeviceToken(gatewayId: string): Promise<void> {
  await SecureStore.deleteItemAsync(`${KEY_DEVICE_TOKEN}:${gatewayId}`);
}

// ─── Saved Gateways List (non-sensitive, use AsyncStorage via SecureStore for simplicity) ─

export async function getSavedGateways(): Promise<SavedGateway[]> {
  const raw = await SecureStore.getItemAsync(KEY_SAVED_GATEWAYS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedGateway[];
  } catch {
    return [];
  }
}

export async function saveGateway(gateway: SavedGateway): Promise<void> {
  const gateways = await getSavedGateways();
  const idx = gateways.findIndex((g) => g.id === gateway.id);
  if (idx >= 0) {
    gateways[idx] = gateway;
  } else {
    gateways.push(gateway);
  }
  await SecureStore.setItemAsync(KEY_SAVED_GATEWAYS, JSON.stringify(gateways));
}

export async function removeGateway(gatewayId: string): Promise<void> {
  const gateways = await getSavedGateways();
  const filtered = gateways.filter((g) => g.id !== gatewayId);
  await SecureStore.setItemAsync(KEY_SAVED_GATEWAYS, JSON.stringify(filtered));
  await deleteGatewayToken(gatewayId);
  await deleteDeviceToken(gatewayId);
}
