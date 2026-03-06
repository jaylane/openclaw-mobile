/**
 * Camera node capability — handle camera.snap from gateway.
 */

import { CameraSnapParams, CameraSnapResult } from '../gateway/protocol';

// Camera ref set by the Canvas/camera screen
let captureCallback: ((params: CameraSnapParams) => Promise<CameraSnapResult>) | null = null;

export function registerCameraCapture(
  cb: (params: CameraSnapParams) => Promise<CameraSnapResult>,
): void {
  captureCallback = cb;
}

export function unregisterCameraCapture(): void {
  captureCallback = null;
}

export async function handleCameraSnap(params: unknown): Promise<CameraSnapResult> {
  const p = (params ?? {}) as CameraSnapParams;

  if (!captureCallback) {
    throw new Error('Camera not available — app may be backgrounded or camera permission denied');
  }

  return captureCallback(p);
}
