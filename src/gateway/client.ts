/**
 * OpenClaw Gateway WebSocket Client
 *
 * Implements protocol v3:
 * - connect.challenge → connect handshake
 * - Request/response correlation via UUID id
 * - Auto-reconnect with exponential backoff
 * - Heartbeat (tick) response
 * - Typed event emission
 */

import { ReconnectManager } from './reconnect';
import { gatewayEvents, GATEWAY_EVENTS } from './events';
import {
  parseFrame,
  buildReqFrame,
  ConnectParams,
  HelloOkPayload,
  ProtocolResponse,
  ConnectChallengePayload,
  NodeInvokePayload,
} from './protocol';
import { getOrCreateIdentity, signChallenge } from './auth';

const APP_VERSION = '0.1.0';
const PROTOCOL_VERSION = 3;
const CLIENT_SCOPES = ['operator.admin'];

export type GatewayState =
  | 'disconnected'
  | 'connecting'
  | 'challenged'
  | 'connected';

interface PendingRequest {
  resolve: (value: ProtocolResponse) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface GatewayConfig {
  url: string;
  token: string;
  pushToken?: string;
  onNodeInvoke?: (payload: NodeInvokePayload) => Promise<unknown>;
}

const REQUEST_TIMEOUT_MS = 30_000;

export class GatewayClient {
  private ws: WebSocket | null = null;
  private config: GatewayConfig | null = null;
  private state: GatewayState = 'disconnected';
  private pending = new Map<string, PendingRequest>();
  private reconnect = new ReconnectManager();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private tickIntervalMs = 30_000;
  private manualDisconnect = false;

  // ─── Public API ─────────────────────────────────────────────────────────────

  async connect(config: GatewayConfig): Promise<void> {
    this.config = config;
    this.manualDisconnect = false;
    this.reconnect.resume();
    this.openSocket();
  }

  disconnect(): void {
    this.manualDisconnect = true;
    this.reconnect.stop();
    this.closeSocket();
    this.setState('disconnected');
  }

  /**
   * Send a request and wait for the correlated response.
   */
  async send<T = unknown>(
    method: string,
    params: Record<string, unknown>,
  ): Promise<ProtocolResponse<T>> {
    if (this.state !== 'connected') {
      return { ok: false, error: { code: 'NOT_CONNECTED', message: 'Gateway not connected' } };
    }

    const id = generateId();
    const frame = buildReqFrame(id, method, params);

    return new Promise<ProtocolResponse<T>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout: ${method} (${id})`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, {
        resolve: resolve as (value: ProtocolResponse) => void,
        reject,
        timer,
      });

      this.ws?.send(JSON.stringify(frame));
    });
  }

  /**
   * Subscribe to a named gateway event.
   * Returns an unsubscribe function.
   */
  on<T>(event: string, handler: (payload: T) => void): () => void {
    return gatewayEvents.on<T>(event, handler);
  }

  getState(): GatewayState {
    return this.state;
  }

  // ─── WebSocket Management ────────────────────────────────────────────────────

  private openSocket(): void {
    if (!this.config) return;
    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.config.url);
    } catch (err) {
      console.error('[GatewayClient] Failed to create WebSocket:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[GatewayClient] WebSocket open, waiting for challenge...');
      this.reconnect.reset();
      this.setState('challenged');
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(typeof event.data === 'string' ? event.data : '');
    };

    this.ws.onerror = (event) => {
      console.error('[GatewayClient] WebSocket error:', event);
      gatewayEvents.emit(GATEWAY_EVENTS.ERROR, event);
    };

    this.ws.onclose = (event) => {
      console.log(`[GatewayClient] WebSocket closed: code=${event.code} reason=${event.reason}`);
      this.stopHeartbeat();
      this.rejectAllPending('Connection closed');
      this.setState('disconnected');
      if (!this.manualDisconnect) {
        this.scheduleReconnect();
      }
    };
  }

  private closeSocket(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close(1000, 'Client disconnect');
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.rejectAllPending('Disconnected');
  }

  private scheduleReconnect(): void {
    this.reconnect.schedule(() => {
      console.log('[GatewayClient] Reconnecting...');
      this.openSocket();
    });
  }

  // ─── Message Handling ────────────────────────────────────────────────────────

  private handleMessage(raw: string): void {
    const frame = parseFrame(raw);
    if (!frame) {
      console.warn('[GatewayClient] Unparseable frame:', raw.slice(0, 200));
      return;
    }

    switch (frame.type) {
      case 'res':
        this.handleResponse(frame.id, { ok: frame.ok, payload: frame.payload, error: frame.error });
        break;

      case 'event':
        this.handleEvent(frame.event, frame.payload);
        break;

      case 'req':
        // Gateway-initiated requests (rare in v3, but handle gracefully)
        console.log('[GatewayClient] Received gateway req:', frame.method);
        break;
    }
  }

  private handleResponse(id: string, response: ProtocolResponse): void {
    const pending = this.pending.get(id);
    if (!pending) {
      console.warn('[GatewayClient] No pending request for id:', id);
      return;
    }
    this.pending.delete(id);
    clearTimeout(pending.timer);
    pending.resolve(response);
  }

  private async handleEvent(event: string, payload: unknown): Promise<void> {
    switch (event) {
      case 'connect.challenge':
        await this.handleChallenge(payload as ConnectChallengePayload);
        break;

      case 'hello-ok':
        this.handleHelloOk(payload as HelloOkPayload);
        break;

      case 'tick':
        // Respond to heartbeat
        this.ws?.send(JSON.stringify({ type: 'event', event: 'tock' }));
        break;

      case 'node.invoke':
        await this.handleNodeInvoke(payload as NodeInvokePayload);
        break;

      default:
        // Forward all other events to subscribers
        gatewayEvents.emit(event, payload);
        break;
    }
  }

  // ─── Handshake ───────────────────────────────────────────────────────────────

  private async handleChallenge(challenge: ConnectChallengePayload): Promise<void> {
    if (!this.config) return;
    console.log('[GatewayClient] Received challenge, signing...');

    try {
      const identity = await getOrCreateIdentity();
      const signedAtMs = Date.now();
      const role = 'node'; // mobile acts as a node (camera, location, etc.)

      const signingPayload = {
        deviceId: identity.id,
        clientId: 'openclaw-ios',
        clientMode: 'node',
        role,
        scopes: CLIENT_SCOPES,
        signedAtMs,
        token: this.config.token,
        nonce: challenge.nonce,
        platform: 'ios',
        deviceFamily: 'mobile',
      };

      const signature = await signChallenge(signingPayload);

      const connectParams: ConnectParams = {
        minProtocol: PROTOCOL_VERSION,
        maxProtocol: PROTOCOL_VERSION,
        client: {
          id: 'openclaw-ios',
          displayName: 'OpenClaw Mobile',
          version: APP_VERSION,
          platform: 'ios',
          deviceFamily: 'mobile',
          mode: 'node',
        },
        role,
        scopes: CLIENT_SCOPES,
        caps: ['camera.snap', 'location.get', 'canvas.navigate', 'canvas.eval', 'canvas.snapshot'],
        commands: ['camera.snap', 'location.get', 'canvas.navigate', 'canvas.eval', 'canvas.snapshot'],
        auth: {
          token: this.config.token,
        },
        device: {
          id: identity.id,
          publicKey: identity.publicKey,
          signature,
          signedAt: signedAtMs,
          nonce: challenge.nonce,
        },
        ...(this.config.pushToken ? { pushToken: this.config.pushToken } : {}),
      };

      const id = generateId();
      const frame = buildReqFrame(id, 'connect', connectParams as unknown as Record<string, unknown>);
      this.ws?.send(JSON.stringify(frame));
    } catch (err) {
      console.error('[GatewayClient] Challenge signing failed:', err);
      gatewayEvents.emit(GATEWAY_EVENTS.ERROR, err);
    }
  }

  private handleHelloOk(payload: HelloOkPayload): void {
    console.log('[GatewayClient] Connected! Session:', payload.sessionId);
    this.setState('connected');

    // Store device token if newly issued
    if (payload.auth?.deviceToken) {
      gatewayEvents.emit(GATEWAY_EVENTS.HELLO_OK, payload);
    } else {
      gatewayEvents.emit(GATEWAY_EVENTS.HELLO_OK, payload);
    }

    // Start heartbeat
    this.tickIntervalMs = payload.policy.tickIntervalMs;
    this.startHeartbeat();
  }

  // ─── Node Invoke ─────────────────────────────────────────────────────────────

  private async handleNodeInvoke(payload: NodeInvokePayload): Promise<void> {
    gatewayEvents.emit(GATEWAY_EVENTS.NODE_INVOKE, payload);

    if (!this.config?.onNodeInvoke) return;

    try {
      const result = await this.config.onNodeInvoke(payload);
      // Send result back via node.result method
      await this.send('node.result', {
        invocationId: payload.invocationId,
        result,
      });
    } catch (err) {
      await this.send('node.result', {
        invocationId: payload.invocationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ─── Heartbeat ───────────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.tickInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'event', event: 'ping' }));
      }
    }, this.tickIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private setState(state: GatewayState): void {
    if (this.state === state) return;
    this.state = state;
    gatewayEvents.emit(GATEWAY_EVENTS.STATE_CHANGE, state);
    if (state === 'connected') gatewayEvents.emit(GATEWAY_EVENTS.CONNECTED, undefined);
    if (state === 'disconnected') gatewayEvents.emit(GATEWAY_EVENTS.DISCONNECTED, undefined);
  }

  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
      this.pending.delete(id);
    }
  }
}

// Singleton client instance
export const gatewayClient = new GatewayClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  // Simple UUID v4 without external deps
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
