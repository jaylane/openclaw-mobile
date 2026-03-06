/**
 * Canvas WebView bridge for node capabilities.
 * The canvas screen registers its WebView ref here so gateway can control it.
 */

import { RefObject } from 'react';
import WebView from 'react-native-webview';
import {
  CanvasNavigateParams,
  CanvasEvalParams,
  CanvasSnapshotResult,
} from '../gateway/protocol';

interface CanvasBridge {
  webViewRef: RefObject<WebView>;
  captureSnapshot: () => Promise<string>; // returns base64 PNG
}

let bridge: CanvasBridge | null = null;

export function registerCanvasBridge(b: CanvasBridge): void {
  bridge = b;
}

export function unregisterCanvasBridge(): void {
  bridge = null;
}

export async function handleCanvasNavigate(params: unknown): Promise<void> {
  const p = params as CanvasNavigateParams;
  if (!bridge) throw new Error('Canvas not available');

  bridge.webViewRef.current?.injectJavaScript(
    `window.location.href = ${JSON.stringify(p.url)}; true;`,
  );
}

export async function handleCanvasEval(params: unknown): Promise<unknown> {
  const p = params as CanvasEvalParams;
  if (!bridge) throw new Error('Canvas not available');

  return new Promise((resolve, reject) => {
    // Use a message channel pattern: inject JS that posts result back
    const callbackId = `__oc_eval_${Date.now()}`;
    const script = `
      (async () => {
        try {
          const result = await (async () => { ${p.js} })();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            __type: 'canvas.eval.result',
            id: ${JSON.stringify(callbackId)},
            result,
          }));
        } catch (err) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            __type: 'canvas.eval.error',
            id: ${JSON.stringify(callbackId)},
            error: err.message,
          }));
        }
      })();
      true;
    `;

    const timeout = setTimeout(() => reject(new Error('canvas.eval timeout')), 15_000);

    // Register one-time message handler
    pendingEvals.set(callbackId, (result, error) => {
      clearTimeout(timeout);
      if (error) reject(new Error(error));
      else resolve(result);
    });

    bridge!.webViewRef.current?.injectJavaScript(script);
  });
}

export async function handleCanvasSnapshot(_params: unknown): Promise<CanvasSnapshotResult> {
  if (!bridge) throw new Error('Canvas not available');

  const base64 = await bridge.captureSnapshot();
  return { data: base64, mimeType: 'image/png' };
}

// ─── Eval callback registry ─────────────────────────────────────────────────

type EvalCallback = (result: unknown, error?: string) => void;
const pendingEvals = new Map<string, EvalCallback>();

export function handleCanvasMessage(data: string): void {
  try {
    const msg = JSON.parse(data) as {
      __type?: string;
      id?: string;
      result?: unknown;
      error?: string;
    };

    if (
      (msg.__type === 'canvas.eval.result' || msg.__type === 'canvas.eval.error') &&
      msg.id
    ) {
      const cb = pendingEvals.get(msg.id);
      if (cb) {
        pendingEvals.delete(msg.id);
        cb(msg.result, msg.error);
      }
    }
  } catch {
    // Not a canvas message
  }
}
