import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { useSettingsStore } from '../src/store/settings';
import { Colors } from '../src/ui/theme';
import {
  registerCanvasBridge,
  unregisterCanvasBridge,
  handleCanvasMessage,
} from '../src/node/canvas';

export default function CanvasScreen() {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.theme);
  const colorScheme = themePreference === 'system' ? (systemScheme ?? 'dark') : themePreference;
  const c = Colors[colorScheme];

  const webViewRef = useRef<WebView>(null);

  const captureSnapshot = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const script = `
        (async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const ctx = canvas.getContext('2d');
            // Simple capture — real implementation would use html2canvas or similar
            ctx.drawWindow ? ctx.drawWindow(window, 0, 0, window.innerWidth, window.innerHeight, 'white') : null;
            const data = canvas.toDataURL('image/png').split(',')[1];
            window.ReactNativeWebView.postMessage(JSON.stringify({
              __type: 'canvas.snapshot.result',
              data,
            }));
          } catch (err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              __type: 'canvas.snapshot.error',
              error: err.message,
            }));
          }
        })();
        true;
      `;

      const timeout = setTimeout(() => reject(new Error('Snapshot timeout')), 10_000);

      // One-time message handler override
      const origHandle = handleCanvasMessage;
      const unsubscribeId = `snapshot-${Date.now()}`;
      snapshotCallbacks.set(unsubscribeId, (data, error) => {
        clearTimeout(timeout);
        if (error) reject(new Error(error));
        else resolve(data!);
      });

      webViewRef.current?.injectJavaScript(script);
    });
  }, []);

  useEffect(() => {
    registerCanvasBridge({
      webViewRef: webViewRef as any,
      captureSnapshot,
    });
    return () => {
      unregisterCanvasBridge();
    };
  }, [captureSnapshot]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    const data = event.nativeEvent.data;

    // Check for snapshot result
    try {
      const msg = JSON.parse(data) as { __type?: string; data?: string; error?: string };
      if (msg.__type === 'canvas.snapshot.result' || msg.__type === 'canvas.snapshot.error') {
        for (const [id, cb] of snapshotCallbacks) {
          snapshotCallbacks.delete(id);
          cb(msg.data, msg.error);
        }
        return;
      }
    } catch {
      // not JSON
    }

    handleCanvasMessage(data);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={[]}>
      <WebView
        ref={webViewRef}
        style={[styles.webview, { backgroundColor: c.background }]}
        source={{ html: INITIAL_HTML }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
      />
    </SafeAreaView>
  );
}

const snapshotCallbacks = new Map<string, (data?: string, error?: string) => void>();

const INITIAL_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0f;
      color: #e8e8f0;
      font-family: -apple-system, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-size: 16px;
    }
    .placeholder {
      text-align: center;
      opacity: 0.4;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="placeholder">
    <div class="icon">🖥</div>
    <div>Canvas ready</div>
    <div style="font-size:12px; margin-top:8px; opacity:0.6;">Waiting for gateway navigation…</div>
  </div>
</body>
</html>
`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
