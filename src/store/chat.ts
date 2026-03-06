/**
 * Zustand store — Messages and sessions.
 */

import { create } from 'zustand';
import { gatewayEvents } from '../gateway/events';
import {
  AgentMessagePayload,
  AgentStreamDeltaPayload,
  AgentStreamEndPayload,
  Session,
  SessionMessage,
} from '../gateway/protocol';
import { gatewayClient } from '../gateway/client';

// ─── Local message type ────────────────────────────────────────────────────

export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'complete' | 'error';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: MessageStatus;
  createdAt: number;
  model?: string;
  streamingDelta?: string; // partial streaming content
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface ChatStore {
  sessions: Session[];
  activeSessionId: string | null;
  messages: Record<string, ChatMessage[]>; // keyed by sessionId
  streamingMessageId: string | null;

  // Actions
  setActiveSession: (sessionId: string) => void;
  setSessions: (sessions: Session[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, update: Partial<ChatMessage>) => void;
  appendStreamDelta: (sessionId: string, messageId: string, delta: string) => void;
  finalizeStream: (sessionId: string, messageId: string, content: string) => void;
  sendMessage: (text: string, sessionId?: string) => Promise<string | null>;
  loadHistory: (sessionId: string, messages: SessionMessage[]) => void;
  clearSession: (sessionId: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => {
  // ─── Subscribe to gateway events ──────────────────────────────────────────

  gatewayEvents.on<AgentMessagePayload>('agent.message', (payload) => {
    const existing = get().messages[payload.sessionId]?.find(
      (m) => m.id === payload.messageId,
    );
    if (existing) {
      get().updateMessage(payload.sessionId, payload.messageId, {
        content: payload.content,
        status: 'complete',
        model: payload.model,
      });
    } else {
      get().addMessage({
        id: payload.messageId,
        sessionId: payload.sessionId,
        role: 'assistant',
        content: payload.content,
        status: 'complete',
        createdAt: Date.now(),
        model: payload.model,
      });
    }
  });

  gatewayEvents.on<AgentStreamDeltaPayload>('agent.stream.delta', (payload) => {
    const messages = get().messages[payload.sessionId];
    const existing = messages?.find((m) => m.id === payload.messageId);

    if (!existing) {
      // Create placeholder for streaming message
      get().addMessage({
        id: payload.messageId,
        sessionId: payload.sessionId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        createdAt: Date.now(),
      });
      set({ streamingMessageId: payload.messageId });
    }

    get().appendStreamDelta(payload.sessionId, payload.messageId, payload.delta);
  });

  gatewayEvents.on<AgentStreamEndPayload>('agent.stream.end', (payload) => {
    get().finalizeStream(payload.sessionId, payload.messageId, payload.content);
    set({ streamingMessageId: null });
  });

  // ─── Store state ──────────────────────────────────────────────────────────

  return {
    sessions: [],
    activeSessionId: null,
    messages: {},
    streamingMessageId: null,

    setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

    setSessions: (sessions) => set({ sessions }),

    addMessage: (message) =>
      set((s) => ({
        messages: {
          ...s.messages,
          [message.sessionId]: [
            ...(s.messages[message.sessionId] ?? []),
            message,
          ],
        },
      })),

    updateMessage: (sessionId, messageId, update) =>
      set((s) => ({
        messages: {
          ...s.messages,
          [sessionId]: (s.messages[sessionId] ?? []).map((m) =>
            m.id === messageId ? { ...m, ...update } : m,
          ),
        },
      })),

    appendStreamDelta: (sessionId, messageId, delta) =>
      set((s) => ({
        messages: {
          ...s.messages,
          [sessionId]: (s.messages[sessionId] ?? []).map((m) =>
            m.id === messageId
              ? { ...m, content: m.content + delta }
              : m,
          ),
        },
      })),

    finalizeStream: (sessionId, messageId, content) =>
      set((s) => ({
        messages: {
          ...s.messages,
          [sessionId]: (s.messages[sessionId] ?? []).map((m) =>
            m.id === messageId
              ? { ...m, content, status: 'complete' }
              : m,
          ),
        },
      })),

    sendMessage: async (text, sessionId) => {
      const targetSession = sessionId ?? get().activeSessionId;
      const tempId = `local-${Date.now()}`;

      // Optimistically add user message
      const userMessage: ChatMessage = {
        id: tempId,
        sessionId: targetSession ?? 'default',
        role: 'user',
        content: text,
        status: 'sending',
        createdAt: Date.now(),
      };
      get().addMessage(userMessage);

      try {
        const params: Record<string, unknown> = { message: text };
        if (targetSession) params['sessionId'] = targetSession;

        const result = await gatewayClient.send<{ messageId: string; sessionId: string }>(
          'chat.send',
          params,
        );

        if (!result.ok) {
          get().updateMessage(
            userMessage.sessionId,
            tempId,
            { status: 'error' },
          );
          return null;
        }

        const payload = result.payload!;

        // Update temp message with real id
        get().updateMessage(userMessage.sessionId, tempId, {
          id: payload.messageId,
          sessionId: payload.sessionId,
          status: 'sent',
        });

        // Switch active session if needed
        if (!get().activeSessionId) {
          set({ activeSessionId: payload.sessionId });
        }

        return payload.sessionId;
      } catch (err) {
        console.error('[ChatStore] sendMessage error:', err);
        get().updateMessage(userMessage.sessionId, tempId, { status: 'error' });
        return null;
      }
    },

    loadHistory: (sessionId, messages) => {
      const chatMessages: ChatMessage[] = messages.map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        role: m.role,
        content: m.content,
        status: 'complete',
        createdAt: m.createdAt,
        model: m.model,
      }));
      set((s) => ({
        messages: {
          ...s.messages,
          [sessionId]: chatMessages,
        },
      }));
    },

    clearSession: (sessionId) =>
      set((s) => {
        const { [sessionId]: _, ...rest } = s.messages;
        return { messages: rest };
      }),
  };
});
