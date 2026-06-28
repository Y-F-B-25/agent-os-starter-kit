// Offline fallback. Used only if the daemon is unreachable for first paint.
// Real data flows through the Zustand store from GET /api/snapshot + WS /api/stream.

import type { Snapshot } from "./types";

export const FALLBACK_SNAPSHOT: Snapshot = {
  agents: [
    { id: "agent-one", name: "Agent One", role: "Orchestrator", hueVar: "--ag-1", status: "idle", contextWindowSize: 1_000_000, currentTokens: 0, currentContextTokens: 0, currentContextPct: 0, currentTools: 0, sessionId: null, lastActiveAt: null, inboxCount: 0, latestSessionFile: null, model: null },
  ],
  projects: [],
  threads: [{ id: "main", title: "Main", count: 0, active: true }],
  messages: [],
  edges: [],
  routines: [],
  routinesMeta: { lastFetchedAt: "", fetchedBy: "" },
  pinnedMessageIds: {},
  telemetry: { totalTokens: 0, totalTools: 0, blocked: 0, inFlight: 0, sessionsLive: 0, todayTokens: 0, todayTools: 0, tokensPerMin: 0 },
  _meta: { phase: 5, generatedAt: new Date().toISOString(), sessionsScanned: 0 },
};
