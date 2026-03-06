# OpenClaw Mobile — React Native iOS App

## Overview

An open-source React Native iOS app that connects to an OpenClaw Gateway, providing full operator + node capabilities on mobile. This is a community alternative to the internal-preview-only native iOS app.

**Project name:** `openclaw-mobile`
**License:** MIT
**Stack:** React Native (Expo) + TypeScript

---

## Architecture

### Connection Model

The app connects to an OpenClaw Gateway via WebSocket (protocol v3). It operates in a **dual-role** mode:

1. **Operator role** — send/receive chat messages, view sessions, manage the agent
2. **Node role** — expose device capabilities (camera, location, notifications) to the gateway

Both roles share a single WebSocket connection with multiplexed frames.

### Gateway Protocol (v3)

All communication uses JSON text frames over WebSocket:

- **Request**: `{ type: "req", id, method, params }`
- **Response**: `{ type: "res", id, ok, payload | error }`
- **Event**: `{ type: "event", event, payload, seq?, stateVersion? }`

#### Handshake Flow

1. Gateway sends `connect.challenge` with `{ nonce, ts }`
2. Client sends `connect` request with:
   - `client.platform: "ios"`, `client.mode: "hybrid"` (operator + node)
   - `role: "operator"` + node `caps` and `commands`
   - `auth.token` (gateway token or device token from pairing)
   - `device.id` (stable device fingerprint from Keychain)
   - `device.publicKey`, `device.signature` (sign the challenge nonce, v3 payload)
3. Gateway responds with `hello-ok` + `auth.deviceToken` if newly paired

#### Key Methods

**Operator:**
- `chat.send` — send a message to the agent
- `chat.stream` — SSE-like streaming of agent responses
- `sessions.list` — list active sessions
- `sessions.history` — fetch message history
- `tools.catalog` — get available tools for an agent
- `system-presence` — show connected devices

**Node:**
- `camera.snap` — capture photo from device camera
- `location.get` — return device GPS coordinates
- `canvas.navigate` — load URL in embedded WebView
- `canvas.eval` — execute JS in the canvas WebView
- `canvas.snapshot` — screenshot the canvas WebView
- `screen.record` — (if permitted) capture screen

#### Events (Gateway → Client)

- `agent.message` — new message from the agent
- `agent.stream.delta` — streaming token delta
- `agent.stream.end` — stream complete
- `node.invoke` — gateway invoking a node capability
- `exec.approval.requested` — exec needs operator approval
- `connect.challenge` — auth challenge on connect

### Security

- **Device identity:** Ed25519 keypair generated on first launch, stored in iOS Keychain
- **Device fingerprint:** SHA-256 of public key = `device.id`
- **Challenge signing:** Sign `{ deviceId, clientId, role, scopes, token, nonce, platform, deviceFamily }` with private key (v3 payload)
- **Token storage:** Gateway token + device token stored in iOS Keychain (not AsyncStorage)
- **TLS:** WSS only for remote connections; WS allowed for localhost/LAN dev

---

## Features (MVP)

### 1. Gateway Connection & Pairing

- **Manual connection:** Enter gateway URL (`wss://host:port`)
- **QR code pairing:** Scan QR from gateway CLI/web UI
- **Bonjour discovery:** Browse `_openclaw-gw._tcp` on local network (nice-to-have for MVP)
- **Auto-reconnect:** Exponential backoff with jitter on disconnect
- **Connection status indicator:** Connected / Connecting / Disconnected

### 2. Chat Interface

- **Message list:** Scrollable chat with user/assistant message bubbles
- **Markdown rendering:** Agent responses often include markdown (code blocks, lists, bold)
- **Streaming responses:** Real-time token-by-token display as agent generates
- **Message input:** Text field + send button + voice input button
- **Image attachments:** Send photos from camera roll or capture
- **File attachments:** PDF, text files from device
- **Session switching:** Swipe/tab to switch between active sessions
- **Message status:** Sent / Delivered / Streaming / Error indicators

### 3. Node Capabilities

The app registers as a node with the gateway, exposing:

- **Camera:** `camera.snap` — front/back camera capture on demand
- **Location:** `location.get` — GPS coordinates with configurable accuracy
- **Notifications:** Forward device notifications to gateway (with permission)
- **Canvas:** `canvas.navigate` / `canvas.eval` / `canvas.snapshot` via embedded WebView

### 4. Push Notifications

- **APNs integration:** Receive push when agent sends a message while app is backgrounded
- **Requires gateway webhook:** Gateway needs to POST to a relay service that sends APNs
- **MVP approach:** Use Expo Push Notifications (free tier, no server needed)
  - On connect, send Expo push token to gateway
  - Gateway fires webhook on agent message → Expo relay → APNs → device

### 5. Voice Input

- **Push-to-talk:** Hold button to record, release to send
- **Speech-to-text:** Use iOS native speech recognition (on-device)
- **Audio message:** Option to send raw audio for server-side transcription
- **Voice wake:** (Post-MVP) "Hey Hex" style activation

### 6. Settings

- **Gateway management:** Add/remove/switch gateways
- **Node permissions:** Toggle camera, location, notification access
- **Appearance:** Light/dark theme, font size
- **About:** Version, license, GitHub link

---

## File Structure

```
openclaw-mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (tabs)/                   # Tab navigator
│   │   ├── chat.tsx              # Main chat screen
│   │   ├── sessions.tsx          # Session list
│   │   ├── devices.tsx           # Connected devices / presence
│   │   └── settings.tsx          # Settings screen
│   ├── _layout.tsx               # Root layout with providers
│   ├── connect.tsx               # Gateway connection / pairing screen
│   └── canvas.tsx                # Full-screen canvas WebView
├── src/
│   ├── gateway/
│   │   ├── client.ts             # WebSocket client (connect, send, receive)
│   │   ├── protocol.ts           # Protocol v3 types and frame builders
│   │   ├── auth.ts               # Device identity, keypair, challenge signing
│   │   ├── reconnect.ts          # Auto-reconnect with exponential backoff
│   │   └── events.ts             # Event emitter / subscription system
│   ├── node/
│   │   ├── capabilities.ts       # Node capability registry
│   │   ├── camera.ts             # Camera snap handler
│   │   ├── location.ts           # Location handler
│   │   ├── canvas.ts             # Canvas WebView bridge
│   │   └── notifications.ts      # Notification forwarding
│   ├── chat/
│   │   ├── types.ts              # Message types
│   │   ├── stream.ts             # Streaming response handler
│   │   └── attachments.ts        # Image/file attachment handling
│   ├── store/
│   │   ├── gateway.ts            # Zustand store — gateway connection state
│   │   ├── chat.ts               # Zustand store — messages & sessions
│   │   ├── settings.ts           # Zustand store — user preferences
│   │   └── secure.ts             # Keychain wrapper for tokens/keys
│   ├── ui/
│   │   ├── theme.ts              # Color tokens, spacing, typography
│   │   ├── MessageBubble.tsx     # Chat message component
│   │   ├── MarkdownRenderer.tsx  # Markdown display component
│   │   ├── StreamingText.tsx     # Animated streaming text
│   │   ├── VoiceInput.tsx        # Push-to-talk component
│   │   ├── ConnectionBadge.tsx   # Connection status indicator
│   │   └── CodeBlock.tsx         # Syntax-highlighted code block
│   └── utils/
│       ├── crypto.ts             # Ed25519 keypair, signing, fingerprint
│       ├── discovery.ts          # Bonjour/mDNS browser (optional)
│       └── haptics.ts            # Haptic feedback helpers
├── assets/                       # App icons, splash screen
├── app.json                      # Expo config
├── package.json
├── tsconfig.json
├── .env.example                  # EXPO_PUBLIC_DEFAULT_GATEWAY_URL (optional)
├── README.md
└── LICENSE
```

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React Native + Expo SDK 52 | Managed workflow, OTA updates, EAS builds |
| Language | TypeScript (strict) | Type safety for protocol frames |
| Routing | Expo Router v4 | File-based, native navigation |
| State | Zustand | Lightweight, no boilerplate, works with RN |
| WebSocket | React Native built-in | Native WS, no extra deps |
| Crypto | expo-crypto + react-native-quick-crypto | Ed25519 keypair + HMAC signing |
| Keychain | expo-secure-store | iOS Keychain for tokens + private keys |
| Camera | expo-camera | Camera capture for node capability |
| Location | expo-location | GPS for node capability |
| Notifications | expo-notifications | Push notification support |
| Markdown | react-native-markdown-display | Render agent markdown responses |
| Voice | expo-av + expo-speech | Audio recording + on-device STT |
| WebView | react-native-webview | Canvas/A2UI rendering |
| Haptics | expo-haptics | Tactile feedback |

---

## Database / Storage

No local database for MVP. All persistent data stored via:
- **Keychain** (expo-secure-store): gateway token, device token, Ed25519 private key
- **AsyncStorage** (expo-async-storage): user preferences, gateway list, cached session list
- **Gateway**: All messages and sessions live on the gateway — the app is a thin client

Post-MVP consideration: SQLite (expo-sqlite) for offline message cache.

---

## Gateway Protocol Implementation

### WebSocket Client (`src/gateway/client.ts`)

```typescript
interface GatewayClient {
  connect(url: string, token: string): Promise<void>;
  disconnect(): void;
  send(method: string, params: Record<string, unknown>): Promise<ProtocolResponse>;
  on(event: string, handler: (payload: unknown) => void): () => void;
  state: 'disconnected' | 'connecting' | 'challenged' | 'connected';
}
```

Key behaviors:
- Wait for `connect.challenge` event before sending `connect` request
- Sign challenge nonce with Ed25519 private key (v3 payload format)
- Maintain request-response correlation via `id` field (UUID)
- Auto-reconnect on close/error with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Heartbeat: respond to gateway tick (every `tickIntervalMs` from `hello-ok`)
- Emit typed events for UI consumption

### Device Identity (`src/gateway/auth.ts`)

```typescript
interface DeviceIdentity {
  id: string;              // SHA-256 fingerprint of public key
  publicKey: string;       // Base64 Ed25519 public key
  privateKey: string;      // Stored in Keychain, never exported
}

async function generateIdentity(): Promise<DeviceIdentity>;
async function signChallenge(nonce: string, params: ConnectParams): Promise<string>;
```

### Node Command Handler (`src/node/capabilities.ts`)

```typescript
// Register handlers for gateway-invoked node commands
const nodeCommands: Record<string, (params: unknown) => Promise<unknown>> = {
  'camera.snap': handleCameraSnap,
  'location.get': handleLocationGet,
  'canvas.navigate': handleCanvasNavigate,
  'canvas.eval': handleCanvasEval,
  'canvas.snapshot': handleCanvasSnapshot,
};
```

When gateway sends `node.invoke` event, dispatch to the registered handler and respond.

---

## Screens

### Connect Screen (`app/connect.tsx`)
- Gateway URL input field
- "Scan QR" button for pairing
- List of saved gateways
- Connection status + error display
- "Add Gateway" flow: URL → test connection → pairing approval → save

### Chat Screen (`app/(tabs)/chat.tsx`)
- Message list (FlatList, inverted for chat UX)
- Streaming text animation for in-progress responses
- Input bar: text field + camera button + voice button + send button
- Long-press message for copy/share
- Pull-to-load-more history

### Sessions Screen (`app/(tabs)/sessions.tsx`)
- List of active sessions with last message preview
- Session metadata: model, token count, age
- Tap to switch active session
- Swipe to archive

### Devices Screen (`app/(tabs)/devices.tsx`)
- Connected devices from `system-presence`
- This device's node status + capabilities
- Toggle capabilities on/off

### Settings Screen (`app/(tabs)/settings.tsx`)
- Gateway management (list, add, remove, switch)
- Node permissions (camera, location, notifications)
- Appearance (theme, font size)
- Voice settings (push-to-talk sensitivity)
- About + version

---

## Build & Deploy

### Development
```bash
npx expo start                    # Start dev server
npx expo start --ios              # Open in iOS simulator
npx expo run:ios --device         # Build and run on physical device
```

### Production (EAS Build)
```bash
eas build --platform ios          # Build for TestFlight
eas submit --platform ios         # Submit to App Store
```

### Environment
```
EXPO_PUBLIC_DEFAULT_GATEWAY_URL=wss://hex-claw.com
```

---

## Security Considerations

1. **No secrets in the app bundle** — all tokens are per-device, issued by gateway during pairing
2. **Keychain for all secrets** — never use AsyncStorage for tokens or keys
3. **Certificate pinning** — optional, configurable per gateway
4. **Challenge-response auth** — prevents replay attacks on connect
5. **Permission prompts** — iOS native permission dialogs for camera, location, notifications
6. **No direct API calls** — all actions go through the gateway; the app is a thin client

---

## Background Behavior

iOS aggressively suspends background apps. Strategy:

- **WebSocket keepalive:** Use background fetch + silent push to reconnect periodically
- **Push notifications:** Primary mechanism for alerting when app is backgrounded
- **Background tasks:** Use `expo-task-manager` for short background work (location updates)
- **No background audio trick:** Don't abuse silent audio to stay alive (App Store rejection risk)
- **Graceful degradation:** Node capabilities unavailable when backgrounded; gateway sees `NODE_BACKGROUND_UNAVAILABLE`

---

## Post-MVP Roadmap

1. **Bonjour/mDNS discovery** — auto-find gateways on LAN
2. **Offline message cache** — SQLite for reading history without connection
3. **Voice wake** — "Hey [agent name]" activation
4. **Widgets** — iOS home screen widget for quick status/send
5. **Shortcuts** — Siri Shortcuts integration for common commands
6. **iPad support** — Split view with session list + chat
7. **Android** — React Native gives us this almost free
8. **Apple Watch** — Companion app for quick voice commands
9. **Exec approval UX** — Rich notification actions for approving exec requests
10. **Multi-gateway** — Quick switch between personal/work gateways

---

## MVP Milestones

1. **Scaffold** — Expo project, navigation, theme, types
2. **Gateway client** — WebSocket connection, protocol v3, auth, reconnect
3. **Pairing flow** — Manual URL entry, challenge signing, token storage
4. **Chat MVP** — Send messages, receive responses (no streaming yet)
5. **Streaming** — Token-by-token response rendering
6. **Node: Camera** — Handle `camera.snap` from gateway
7. **Node: Location** — Handle `location.get` from gateway
8. **Canvas** — Embedded WebView for A2UI
9. **Push notifications** — Expo push integration
10. **Voice input** — Push-to-talk recording + send
11. **Polish** — Haptics, animations, error handling, loading states
12. **Release** — TestFlight beta → App Store submission
