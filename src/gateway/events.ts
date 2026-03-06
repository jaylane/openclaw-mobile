/**
 * Typed event emitter for gateway events.
 * Keeps the UI layer decoupled from WebSocket internals.
 */

type EventHandler<T = unknown> = (payload: T) => void;

export class EventEmitter {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    set.add(handler as EventHandler);
    return () => {
      set.delete(handler as EventHandler);
    };
  }

  once<T>(event: string, handler: EventHandler<T>): () => void {
    const wrapped: EventHandler<T> = (payload) => {
      handler(payload);
      off();
    };
    const off = this.on(event, wrapped);
    return off;
  }

  emit<T>(event: string, payload: T): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventEmitter] Error in handler for "${event}":`, err);
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}

// Singleton emitter for gateway events
export const gatewayEvents = new EventEmitter();

// ─── Well-known event names ──────────────────────────────────────────────────

export const GATEWAY_EVENTS = {
  // Connection lifecycle
  STATE_CHANGE: 'gateway:state-change',
  CONNECTED: 'gateway:connected',
  DISCONNECTED: 'gateway:disconnected',
  ERROR: 'gateway:error',

  // Protocol events from gateway
  AGENT_MESSAGE: 'agent.message',
  AGENT_STREAM_DELTA: 'agent.stream.delta',
  AGENT_STREAM_END: 'agent.stream.end',
  NODE_INVOKE: 'node.invoke',
  EXEC_APPROVAL: 'exec.approval.requested',
  CONNECT_CHALLENGE: 'connect.challenge',
  HELLO_OK: 'hello-ok',
} as const;

export type GatewayEventName = (typeof GATEWAY_EVENTS)[keyof typeof GATEWAY_EVENTS];
