/**
 * Exponential backoff reconnect manager.
 * Delays: 1s, 2s, 4s, 8s, 16s, 30s (capped), with ±20% jitter.
 */

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;
const JITTER_FACTOR = 0.2;

export class ReconnectManager {
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  reset(): void {
    this.attempt = 0;
    this.clearTimer();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimer();
  }

  resume(): void {
    this.stopped = false;
  }

  schedule(callback: () => void): void {
    if (this.stopped) return;
    this.clearTimer();
    const delay = this.nextDelay();
    console.log(`[Reconnect] Attempt ${this.attempt + 1} in ${Math.round(delay)}ms`);
    this.timer = setTimeout(() => {
      if (!this.stopped) {
        this.attempt++;
        callback();
      }
    }, delay);
  }

  private nextDelay(): number {
    const base = Math.min(BASE_DELAY_MS * Math.pow(2, this.attempt), MAX_DELAY_MS);
    const jitter = base * JITTER_FACTOR * (Math.random() * 2 - 1);
    return Math.max(BASE_DELAY_MS, base + jitter);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  get attemptNumber(): number {
    return this.attempt;
  }
}
