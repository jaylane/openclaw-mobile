/**
 * Zustand store — Gateway connection state.
 */

import { create } from 'zustand';
import { GatewayState, gatewayClient } from '../gateway/client';
import { gatewayEvents, GATEWAY_EVENTS } from '../gateway/events';
import { HelloOkPayload } from '../gateway/protocol';
import {
  SavedGateway,
  getSavedGateways,
  saveGateway,
  removeGateway,
  getGatewayToken,
  getDeviceToken,
  saveDeviceToken,
} from './secure';
import { nodeCapabilities } from '../node/capabilities';

interface GatewayStore {
  // Connection
  state: GatewayState;
  activeGatewayId: string | null;
  gatewaySessionId: string | null;
  error: string | null;

  // Saved gateways
  gateways: SavedGateway[];

  // Actions
  loadGateways: () => Promise<void>;
  connectToGateway: (gateway: SavedGateway) => Promise<void>;
  disconnect: () => void;
  addGateway: (gateway: SavedGateway) => Promise<void>;
  deleteGateway: (gatewayId: string) => Promise<void>;
  clearError: () => void;
}

export const useGatewayStore = create<GatewayStore>((set, get) => {
  // Subscribe to gateway events
  gatewayEvents.on<GatewayState>(GATEWAY_EVENTS.STATE_CHANGE, (state) => {
    set({ state });
    if (state === 'disconnected') {
      set({ gatewaySessionId: null });
    }
  });

  gatewayEvents.on<HelloOkPayload>(GATEWAY_EVENTS.HELLO_OK, async (payload) => {
    set({ gatewaySessionId: payload.sessionId });

    // Persist device token if newly issued
    const { activeGatewayId } = get();
    if (activeGatewayId && payload.auth?.deviceToken) {
      await saveDeviceToken(activeGatewayId, payload.auth.deviceToken);
    }
  });

  gatewayEvents.on<unknown>(GATEWAY_EVENTS.ERROR, (err) => {
    const message = err instanceof Error ? err.message : String(err);
    set({ error: message });
  });

  return {
    state: 'disconnected',
    activeGatewayId: null,
    gatewaySessionId: null,
    error: null,
    gateways: [],

    loadGateways: async () => {
      const gateways = await getSavedGateways();
      set({ gateways });
    },

    connectToGateway: async (gateway: SavedGateway) => {
      set({ error: null, activeGatewayId: gateway.id });

      // Try device token first (post-pairing), fall back to gateway token
      const deviceToken = await getDeviceToken(gateway.id);
      const gatewayToken = await getGatewayToken(gateway.id);
      const token = deviceToken ?? gatewayToken ?? gateway.token ?? '';

      await gatewayClient.connect({
        url: gateway.url,
        token,
        onNodeInvoke: nodeCapabilities.handleInvoke.bind(nodeCapabilities),
      });

      // Update last connected
      const updated = { ...gateway, lastConnected: Date.now() };
      await saveGateway(updated);
      set((s) => ({
        gateways: s.gateways.map((g) => (g.id === gateway.id ? updated : g)),
      }));
    },

    disconnect: () => {
      gatewayClient.disconnect();
      set({ activeGatewayId: null, gatewaySessionId: null });
    },

    addGateway: async (gateway: SavedGateway) => {
      await saveGateway(gateway);
      set((s) => ({
        gateways: [...s.gateways.filter((g) => g.id !== gateway.id), gateway],
      }));
    },

    deleteGateway: async (gatewayId: string) => {
      await removeGateway(gatewayId);
      set((s) => ({ gateways: s.gateways.filter((g) => g.id !== gatewayId) }));
      if (get().activeGatewayId === gatewayId) {
        gatewayClient.disconnect();
        set({ activeGatewayId: null });
      }
    },

    clearError: () => set({ error: null }),
  };
});
