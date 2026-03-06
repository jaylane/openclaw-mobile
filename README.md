# OpenClaw Mobile

An open-source React Native iOS app that connects to an [OpenClaw Gateway](https://github.com/openclaw), providing full operator + node capabilities on mobile.

## Features

- **Gateway Connection**: WebSocket protocol v3 with Ed25519 challenge-response auth
- **Chat Interface**: Send/receive messages with real-time streaming responses
- **Markdown Rendering**: Full markdown support including code blocks
- **Node Capabilities**: Camera snap, GPS location, canvas WebView — exposed to the gateway
- **Push Notifications**: Background alerts via Expo Push
- **Voice Input**: Push-to-talk with on-device speech recognition
- **Secure Storage**: All tokens/keys in iOS Keychain (never AsyncStorage)
- **Auto-reconnect**: Exponential backoff reconnection with jitter

## Tech Stack

- **React Native** + Expo SDK 52
- **TypeScript** (strict mode)
- **Expo Router v4** — file-based navigation
- **Zustand** — state management
- **expo-secure-store** — Keychain for secrets
- **react-native-webview** — Canvas/A2UI rendering

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npx expo start

# Run on iOS simulator
npx expo start --ios
```

## Environment

Copy `.env.example` to `.env.local`:
```
EXPO_PUBLIC_DEFAULT_GATEWAY_URL=wss://your-gateway.example.com
```

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for TestFlight
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

## Architecture

The app operates in **dual-role** mode:
- **Operator**: Send/receive chat messages, manage sessions
- **Node**: Expose device capabilities (camera, location, canvas) to the gateway

All communication goes through the OpenClaw Gateway via WebSocket. The app is a thin client — no local database, all message history lives on the gateway.

## Security

- Ed25519 keypair generated on first launch, stored in iOS Keychain
- Challenge-response auth on every connection (v3 protocol)
- Tokens never stored in AsyncStorage
- All remote connections require WSS (TLS)

## License

MIT — see [LICENSE](./LICENSE)
