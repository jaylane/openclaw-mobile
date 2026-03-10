/**
 * OpenClaw Gateway Protocol v3 Types
 *
 * All communication uses JSON text frames over WebSocket:
 * - Request: { type: "req", id, method, params }
 * - Response: { type: "res", id, ok, payload | error }
 * - Event: { type: "event", event, payload, seq?, stateVersion? }
 */

// ─── Base Frame Types ────────────────────────────────────────────────────────

export interface ReqFrame {
  type: 'req';
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface ResFrame {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface EventFrame {
  type: 'event';
  event: string;
  payload: unknown;
  seq?: number;
  stateVersion?: number;
}

export type ProtocolFrame = ReqFrame | ResFrame | EventFrame;

// ─── Connect / Auth ──────────────────────────────────────────────────────────

export interface ConnectChallengePayload {
  nonce: string;
  ts: number;
}

export interface ConnectParams {
  minProtocol: number;
  maxProtocol: number;
  client: {
    id: string;         // e.g. 'openclaw-ios'
    displayName?: string;
    version: string;
    platform: string;   // e.g. 'ios'
    deviceFamily?: string;
    mode: string;       // 'node' | 'webchat' | 'cli' | 'ui' | 'backend'
  };
  role?: string;
  scopes?: string[];
  caps?: string[];
  commands?: string[];
  auth?: {
    token?: string;
    deviceToken?: string;
  };
  device?: {
    id: string;
    publicKey: string;
    signature: string;
    signedAt: number;   // ms timestamp
    nonce: string;
  };
  pushToken?: string;
}

/** v3 signing payload fields — assembled into a pipe-delimited string before signing */
export interface V3SigningPayload {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string | null;
  nonce: string;
  platform: string;
  deviceFamily: string;
}

/**
 * Build the v3 pipe-delimited signing payload string.
 * Must match gateway's buildDeviceAuthPayloadV3 exactly.
 */
export function buildV3SigningPayload(p: V3SigningPayload): string {
  return [
    'v3',
    p.deviceId,
    p.clientId,
    p.clientMode,
    p.role,
    p.scopes.join(','),
    String(p.signedAtMs),
    p.token ?? '',
    p.nonce,
    p.platform,
    p.deviceFamily,
  ].join('|');
}

export interface HelloOkPayload {
  sessionId: string;
  auth?: {
    deviceToken?: string;
  };
  policy: {
    tickIntervalMs: number;
    maxPayloadBytes?: number;
  };
  server: {
    version: string;
    capabilities?: string[];
  };
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatSendParams {
  sessionId?: string;
  message: string;
  role?: 'user';
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  type: 'image' | 'file' | 'audio';
  data: string; // base64
  mimeType: string;
  name?: string;
}

export interface ChatSendResult {
  messageId: string;
  sessionId: string;
}

export interface AgentMessagePayload {
  sessionId: string;
  messageId: string;
  role: 'assistant';
  content: string;
  model?: string;
  finishReason?: string;
}

export interface AgentStreamDeltaPayload {
  sessionId: string;
  messageId: string;
  delta: string;
  seq: number;
}

export interface AgentStreamEndPayload {
  sessionId: string;
  messageId: string;
  content: string;
  model?: string;
  tokenCount?: number;
  finishReason?: string;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  title?: string;
  model?: string;
  createdAt: number;
  updatedAt: number;
  messageCount?: number;
  tokenCount?: number;
  lastMessage?: string;
}

export interface SessionsListResult {
  sessions: Session[];
}

export interface SessionsHistoryParams {
  sessionId: string;
  limit?: number;
  before?: string;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  model?: string;
}

export interface SessionsHistoryResult {
  messages: SessionMessage[];
  hasMore: boolean;
}

// ─── Node / Capabilities ─────────────────────────────────────────────────────

export interface NodeInvokePayload {
  invocationId: string;
  command: string;
  params: unknown;
}

export interface NodeInvokeResult {
  invocationId: string;
  result?: unknown;
  error?: string;
}

export interface CameraSnapParams {
  camera?: 'front' | 'back';
  quality?: number;
}

export interface CameraSnapResult {
  data: string; // base64 JPEG
  width: number;
  height: number;
  mimeType: 'image/jpeg';
}

export interface LocationGetParams {
  accuracy?: 'low' | 'medium' | 'high';
}

export interface LocationGetResult {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface CanvasNavigateParams {
  url: string;
}

export interface CanvasEvalParams {
  js: string;
}

export interface CanvasSnapshotResult {
  data: string; // base64 PNG
  mimeType: 'image/png';
}

// ─── Presence ────────────────────────────────────────────────────────────────

export interface PresenceDevice {
  id: string;
  platform?: string;
  role?: string;
  caps?: string[];
  connectedAt?: number;
}

export interface SystemPresenceResult {
  devices: PresenceDevice[];
}

// ─── Exec Approval ───────────────────────────────────────────────────────────

export interface ExecApprovalPayload {
  approvalId: string;
  command: string;
  args?: string[];
  cwd?: string;
  reason?: string;
}

// ─── Protocol Response Wrapper ───────────────────────────────────────────────

export interface ProtocolResponse<T = unknown> {
  ok: boolean;
  payload?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ─── Frame Builders ──────────────────────────────────────────────────────────

export function buildReqFrame(
  id: string,
  method: string,
  params: Record<string, unknown>,
): ReqFrame {
  return { type: 'req', id, method, params };
}

export function parseFrame(raw: string): ProtocolFrame | null {
  try {
    const frame = JSON.parse(raw) as unknown;
    if (typeof frame !== 'object' || frame === null) return null;
    const f = frame as Record<string, unknown>;
    if (f['type'] === 'req' || f['type'] === 'res' || f['type'] === 'event') {
      return f as unknown as ProtocolFrame;
    }
    return null;
  } catch {
    return null;
  }
}
