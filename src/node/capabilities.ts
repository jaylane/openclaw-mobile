/**
 * Node capability registry.
 * Dispatches gateway node.invoke events to the appropriate handler.
 */

import { NodeInvokePayload } from '../gateway/protocol';
import { handleCameraSnap } from './camera';
import { handleLocationGet } from './location';
import {
  handleCanvasNavigate,
  handleCanvasEval,
  handleCanvasSnapshot,
} from './canvas';

type NodeCommandHandler = (params: unknown) => Promise<unknown>;

class NodeCapabilityRegistry {
  private handlers: Map<string, NodeCommandHandler> = new Map([
    ['camera.snap', handleCameraSnap],
    ['location.get', handleLocationGet],
    ['canvas.navigate', handleCanvasNavigate],
    ['canvas.eval', handleCanvasEval],
    ['canvas.snapshot', handleCanvasSnapshot],
  ]);

  register(command: string, handler: NodeCommandHandler): void {
    this.handlers.set(command, handler);
  }

  unregister(command: string): void {
    this.handlers.delete(command);
  }

  async handleInvoke(payload: NodeInvokePayload): Promise<unknown> {
    const handler = this.handlers.get(payload.command);
    if (!handler) {
      throw new Error(`Unknown node command: ${payload.command}`);
    }
    return handler(payload.params);
  }

  get registeredCommands(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export const nodeCapabilities = new NodeCapabilityRegistry();
