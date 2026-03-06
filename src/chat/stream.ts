/**
 * Streaming response handler — manages token accumulation and cursor state.
 */

type StreamCallback = (partial: string, done: boolean) => void;

export class StreamHandler {
  private buffer = '';
  private done = false;
  private callback: StreamCallback;

  constructor(callback: StreamCallback) {
    this.callback = callback;
  }

  appendDelta(delta: string): void {
    if (this.done) return;
    this.buffer += delta;
    this.callback(this.buffer, false);
  }

  finalize(fullContent: string): void {
    this.done = true;
    this.buffer = fullContent;
    this.callback(fullContent, true);
  }

  reset(): void {
    this.buffer = '';
    this.done = false;
  }

  get content(): string {
    return this.buffer;
  }

  get isComplete(): boolean {
    return this.done;
  }
}
