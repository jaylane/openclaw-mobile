/**
 * Chat-layer types (separate from gateway protocol types).
 */

export type AttachmentType = 'image' | 'file' | 'audio';

export interface MessageAttachment {
  id: string;
  type: AttachmentType;
  uri: string;        // local URI
  name?: string;
  mimeType?: string;
  size?: number;
}

export interface PendingMessage {
  text: string;
  attachments?: MessageAttachment[];
  sessionId?: string;
}

export type StreamState = 'idle' | 'streaming' | 'complete' | 'error';
