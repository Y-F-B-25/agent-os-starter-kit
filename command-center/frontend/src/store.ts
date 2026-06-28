import { create } from "zustand";
import type { Snapshot, Message, Attachment, ProjectStatus } from "./types";
import { FALLBACK_SNAPSHOT } from "./data";

const ALL_STATUSES: ProjectStatus[] = ["in-flight", "blocked", "planned", "done"];
const DEFAULT_STATUSES: ProjectStatus[] = ["in-flight", "blocked", "planned"];

const DAEMON_HTTP = ((import.meta as any).env?.VITE_DAEMON_HTTP as string) || "http://127.0.0.1:8787";
const DAEMON_WS = ((import.meta as any).env?.VITE_DAEMON_WS as string) || "ws://127.0.0.1:8787/api/stream";

export interface OutgoingAttachment {
  name: string;
  mime: string;
  dataBase64: string;
  // For optimistic UI: the same image displayed locally before the server returns its url.
  previewUrl: string;
}

interface StoreState {
  snapshot: Snapshot;
  connected: boolean;
  hydrated: boolean;
  lastError: string | null;
  optimisticMessages: Message[];
  projectStatusFilter: Set<ProjectStatus>;

  hydrate: () => Promise<void>;
  startStream: () => void;
  postMessage: (channelId: string, body: string, mentions: string[], attachments?: OutgoingAttachment[]) => Promise<void>;
  renameAgent: (id: string, name: string) => Promise<void>;
  toggleProjectStatus: (s: ProjectStatus) => void;
  isolateProjectStatus: (s: ProjectStatus) => void;
  resetProjectStatusFilter: () => void;
  pinMessage: (channelId: string, messageId: string) => Promise<void>;
  unpinMessage: (channelId: string, messageId: string) => Promise<void>;
}

let wsRef: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;

export const useStore = create<StoreState>((set, get) => ({
  snapshot: FALLBACK_SNAPSHOT,
  connected: false,
  hydrated: false,
  lastError: null,
  optimisticMessages: [],
  projectStatusFilter: new Set(DEFAULT_STATUSES),

  toggleProjectStatus: (s) => {
    set((state) => {
      const next = new Set(state.projectStatusFilter);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return { projectStatusFilter: next };
    });
  },
  isolateProjectStatus: (s) => set({ projectStatusFilter: new Set([s]) }),
  resetProjectStatusFilter: () => set({ projectStatusFilter: new Set(ALL_STATUSES) }),

  hydrate: async () => {
    try {
      const r = await fetch(`${DAEMON_HTTP}/api/snapshot`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const snap = (await r.json()) as Snapshot;
      set({ snapshot: snap, hydrated: true, lastError: null });
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : String(e) });
    }
  },

  startStream: () => {
    if (wsRef && wsRef.readyState !== WebSocket.CLOSED) return;
    const open = () => {
      const ws = new WebSocket(DAEMON_WS);
      wsRef = ws;
      ws.onopen = () => {
        reconnectAttempt = 0;
        set({ connected: true, lastError: null });
      };
      ws.onmessage = (ev) => {
        try {
          const frame = JSON.parse(ev.data);
          if (frame.type === "snapshot" && frame.data) {
            const snap = frame.data as Snapshot;
            set((s) => ({
              snapshot: snap,
              hydrated: true,
              optimisticMessages: s.optimisticMessages.filter(
                (om) => !snap.messages.some((m) => m.id === om.id)
              ),
            }));
          }
        } catch (e) {
          set({ lastError: `ws frame: ${e instanceof Error ? e.message : String(e)}` });
        }
      };
      ws.onerror = () => {
        set({ lastError: "ws error" });
      };
      ws.onclose = () => {
        set({ connected: false });
        const delay = Math.min(15_000, 500 * 2 ** reconnectAttempt);
        reconnectAttempt += 1;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(open, delay);
      };
    };
    open();
  },

  postMessage: async (channelId, body, mentions, attachments) => {
    const at = new Date().toISOString();
    const optimisticAttachments: Attachment[] = (attachments || []).map((a) => ({
      name: a.name,
      mime: a.mime,
      size: 0,
      url: a.previewUrl,
    }));
    const optimistic: Message = {
      id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId,
      authorId: "me",
      body,
      mentions,
      routedTo: mentions,
      toolCalls: [],
      timestamp: new Date(at).toTimeString().slice(0, 8),
      ts: at,
      pending: true,
      attachments: optimisticAttachments,
    };
    set((s) => ({ optimisticMessages: [...s.optimisticMessages, optimistic] }));
    try {
      const wireAttachments = (attachments || []).map((a) => ({
        name: a.name,
        mime: a.mime,
        dataBase64: a.dataBase64,
      }));
      const r = await fetch(`${DAEMON_HTTP}/api/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, body, mentions, at, authorId: "me", attachments: wireAttachments }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status}: ${txt}`);
      }
      set((s) => ({
        optimisticMessages: s.optimisticMessages.filter((m) => m.id !== optimistic.id),
      }));
      get().hydrate();
    } catch (e) {
      set((s) => ({
        optimisticMessages: s.optimisticMessages.filter((m) => m.id !== optimistic.id),
        lastError: e instanceof Error ? e.message : String(e),
      }));
    }
  },

  pinMessage: async (channelId, messageId) => {
    try {
      const r = await fetch(`${DAEMON_HTTP}/api/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "pin", channelId, messageId }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      get().hydrate();
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : String(e) });
    }
  },

  unpinMessage: async (channelId, messageId) => {
    try {
      const r = await fetch(`${DAEMON_HTTP}/api/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "unpin", channelId, messageId }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      get().hydrate();
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : String(e) });
    }
  },

  renameAgent: async (id, name) => {
    try {
      const r = await fetch(`${DAEMON_HTTP}/api/agent-rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status}: ${txt}`);
      }
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : String(e) });
    }
  },
}));

export const DAEMON_BASE = DAEMON_HTTP;

export function useMessages(channelId: string) {
  return useStore((s) => {
    // Filter out harness-authored signal records. They are metadata for agent
    // routing (already surfaced via the AgentRail attention badge + inbox files
    // that agents poll). Showing them in the human-facing chat reads as an
    // echo of the user's own message because the body templates as
    // "the owner @<agent> in chat — event_id ...". the owner flagged this as noisy
    // 2026-05-04. CC v5 fix.
    const isHuman = (m: { authorId: string }) => m.authorId !== "harness";
    const real = s.snapshot.messages
      .filter((m) => (m.channelId || "main") === channelId)
      .filter(isHuman);
    const opt = s.optimisticMessages
      .filter((m) => (m.channelId || "main") === channelId)
      .filter(isHuman);
    return [...real, ...opt];
  });
}
