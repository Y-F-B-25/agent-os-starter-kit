// Assemble a snapshot in the data.js shape:
// { agents[], projects[], threads[], messages[], edges[], telemetry, _meta }
//
// Phase 1 fills agents + telemetry from real sources; projects/threads/messages/edges
// stay empty arrays. The shape is pinned so the Phase 2 frontend swap is mechanical.

import fsp from "node:fs/promises";
import path from "node:path";
import { AGENT_ROSTER, PATHS } from "../config.mjs";
import { scanAllSessions, rollupByAgent, todayTotals, tokensPerMinAll } from "./jsonl.mjs";
import { snapshotAgentVaultState } from "./vault.mjs";
import { readChatLog, readRouteLog } from "./post.mjs";
import { loadAllProjects, buildEdges } from "./projects.mjs";
import { loadOverrides } from "./overrides.mjs";
import { loadRoutines } from "./routines.mjs";
import { loadPins } from "./pins.mjs";
import { pendingSummary as harnessPendingSummary } from "./harness.mjs";
import { loadAgentSdkState } from "./agent-sdk-state.mjs";
import { log } from "./log.mjs";

// Sidecar map written on every snapshot build. The poll-broadcast.py and
// inject-rules.py hooks read this instead of hitting the daemon HTTP endpoint
// for self-author skip resolution. Eliminates the v4-era 2.0s urllib timeout
// race where heavy daemon load made the skip a no-op and own posts echoed
// back into own context. CC v5 fix 2026-05-03.
const SESSION_MAP_PATH = path.join(PATHS.logDir, "session_agent_map.json");
const BUILTIN_THREADS = [
  { id: "main", title: "Main", agents: [] },
];

async function writeSessionAgentMap(agents) {
  const map = {};
  for (const a of agents) {
    if (a.sessionId && a.name) map[a.sessionId] = String(a.name).toLowerCase();
  }
  try {
    await fsp.mkdir(path.dirname(SESSION_MAP_PATH), { recursive: true });
    await fsp.writeFile(SESSION_MAP_PATH, JSON.stringify({ updatedAt: new Date().toISOString(), map }, null, 2) + "\n", "utf8");
  } catch (e) { log.warn("snapshot: session map write failed", e.message); }
}

function titleForThreadId(id) {
  const builtin = BUILTIN_THREADS.find((t) => t.id === id);
  if (builtin) return builtin.title;
  return id.split(/[-_.]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(" ") || id;
}

function buildThreads(messages) {
  const counts = new Map();
  for (const m of messages) {
    const id = m.channelId || "main";
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const ids = new Set([...BUILTIN_THREADS.map((t) => t.id), ...counts.keys()]);
  return Array.from(ids).map((id) => {
    const builtin = BUILTIN_THREADS.find((t) => t.id === id);
    return {
      id,
      title: titleForThreadId(id),
      count: counts.get(id) || 0,
      active: id === "main",
      agents: builtin?.agents || [],
    };
  });
}

function statusFor(sessionState, vaultState) {
  if (!sessionState) return "idle";
  const ts = sessionState.totals.lastTimestamp;
  if (!ts) return "idle";
  const age = Date.now() - new Date(ts).getTime();
  if (age < 5 * 60 * 1000) return "working";
  if (vaultState && vaultState.inboxCount > 0) return "blocked";
  return "idle";
}

export async function buildSnapshot() {
  const sessionStates = await scanAllSessions();
  const byAgent = rollupByAgent(sessionStates);
  const vaultByAgent = await snapshotAgentVaultState();
  const today = todayTotals(sessionStates);
  const overrides = await loadOverrides();

  // Harness v1: per-agent outstanding signal counts. Empty {} when disabled.
  const harnessPending = (() => {
    try { return harnessPendingSummary(); } catch { return { byAgent: {}, total: 0, enabled: false }; }
  })();

  const agents = AGENT_ROSTER.map(a => {
    const s = byAgent.get(a.id);
    const v = vaultByAgent[a.id] || { inboxCount: 0, latestSessionFile: null };
    const ctxTokens = s ? (s.totals.contextTokens || 0) : 0;
    const ctxPct = a.contextWindowSize > 0 ? ctxTokens / a.contextWindowSize : 0;
    const displayName = overrides[a.id] || a.name;
    const attention = harnessPending.byAgent[a.id] || 0;
    return {
      id: a.id,
      name: displayName,
      role: a.role,
      hueVar: a.hueVar,
      status: statusFor(s, v),
      contextWindowSize: a.contextWindowSize,
      currentTokens: s ? s.totals.tokens : 0,
      currentContextTokens: ctxTokens,
      currentContextPct:    ctxPct,
      currentTools:  s ? s.totals.tools  : 0,
      sessionId:     s ? s.sessionId     : null,
      lastActiveAt:  s ? s.totals.lastTimestamp : null,
      inboxCount:    v.inboxCount,
      latestSessionFile: v.latestSessionFile,
      model:         s ? s.totals.model : null,
      attentionCount: attention,
    };
  });

  // Fire-and-forget sidecar update for the hooks. Failure logged, not thrown.
  writeSessionAgentMap(agents);

  const totalTokens = agents.reduce((acc, a) => acc + a.currentTokens, 0);
  const totalTools  = agents.reduce((acc, a) => acc + a.currentTools, 0);

  const messages = await readChatLog(200);
  const threads = buildThreads(messages);

  const projects = await loadAllProjects();
  const routes = await readRouteLog();
  const edges = buildEdges(projects, routes);
  const routinesData = await loadRoutines();
  const pinsByChannel = await loadPins();
  const agentSdk = await loadAgentSdkState();

  const projectsBlocked = projects.filter(p => p.status === "blocked").length;
  const projectsInFlight = projects.filter(p => p.status === "in-flight").length;

  return {
    agents,
    projects,
    threads,
    messages,
    edges,
    routines: routinesData.routines,
    routinesMeta: { lastFetchedAt: routinesData.lastFetchedAt, fetchedBy: routinesData.fetchedBy },
    pinnedMessageIds: pinsByChannel,
    harness: harnessPending,
    agentSdk,
    telemetry: {
      totalTokens,
      totalTools,
      blocked:       projectsBlocked || agents.filter(a => a.status === "blocked").length,
      inFlight:      projectsInFlight || agents.filter(a => a.status === "working").length,
      sessionsLive:  today.sessionsLive,
      todayTokens:   today.tokens,
      todayTools:    today.tools,
      tokensPerMin:  tokensPerMinAll(sessionStates),
    },
    _meta: {
      phase: 5,
      generatedAt: new Date().toISOString(),
      sessionsScanned: sessionStates.length,
    },
  };
}
