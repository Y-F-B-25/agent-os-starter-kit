// Tail Claude Code session JSONLs. Derive per-session telemetry.
// Stateful: tracks file size + last-parsed offset per JSONL so re-scans are O(new bytes).

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { PATHS, AGENT_FINGERPRINTS } from "../config.mjs";
import { log } from "./log.mjs";

// session id -> { file, size, agentId, totals: {tokens, tools, lastTimestamp, model}, fingerprintScanned }
const sessions = new Map();

function tokenCount(usage) {
  if (!usage) return 0;
  // Sum input + cache_creation + cache_read + output. Mirrors how Claude Code tallies usage in dashboards.
  return (
    (usage.input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) +
    (usage.cache_read_input_tokens || 0) +
    (usage.output_tokens || 0)
  );
}

// Context fill = the prompt side only (what occupies the model's context window
// at the next turn). Output tokens do not count against the window.
function contextTokenCount(usage) {
  if (!usage) return 0;
  return (
    (usage.input_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) +
    (usage.cache_read_input_tokens || 0)
  );
}

function matchAgent(text) {
  if (!text) return null;
  for (const { id, needle } of AGENT_FINGERPRINTS) {
    if (text.includes(needle)) return id;
  }
  return null;
}

function processRecord(state, record) {
  const msg = record.message;
  if (record.type === "assistant" && msg && msg.usage) {
    const cumTokens = tokenCount(msg.usage);
    state.totals.tokens = cumTokens;  // last assistant turn = current cumulative usage
    state.totals.contextTokens = contextTokenCount(msg.usage);  // current prompt fill
    state.totals.lastTimestamp = record.timestamp || state.totals.lastTimestamp;
    state.totals.model = msg.model || state.totals.model;
    if (Array.isArray(msg.content)) {
      for (const c of msg.content) {
        if (c && c.type === "tool_use") state.totals.tools += 1;
      }
    }
    // Append the cumulative-tokens point so we can derive deltas for the
    // 60-second rolling window. Per-record cumulative; deltas computed at rollup.
    if (record.timestamp) {
      state.turnLog.push({ at: record.timestamp, cum: cumTokens });
    }
  }
  // Fingerprint match: scan early user messages for boot-prompt strings.
  if (!state.agentId && record.type === "user" && msg) {
    const content = msg.content;
    let text = "";
    if (typeof content === "string") text = content;
    else if (Array.isArray(content)) {
      for (const c of content) {
        if (typeof c === "string") text += c;
        else if (c && typeof c.text === "string") text += c.text + "\n";
      }
    }
    const matched = matchAgent(text);
    if (matched) state.agentId = matched;
  }
}

async function readWholeFile(filepath) {
  const stream = fs.createReadStream(filepath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const records = [];
  for await (const line of rl) {
    if (!line) continue;
    try { records.push(JSON.parse(line)); } catch {}
  }
  return records;
}

async function scanFile(filepath) {
  const sessionId = path.basename(filepath, ".jsonl");
  const stat = await fsp.stat(filepath).catch(() => null);
  if (!stat || !stat.isFile()) return null;

  let state = sessions.get(sessionId);
  if (!state) {
    state = {
      file: filepath, size: 0, agentId: null,
      totals: { tokens: 0, tools: 0, lastTimestamp: null, model: null, contextTokens: 0 },
      turnLog: [],
    };
    sessions.set(sessionId, state);
  }

  // If file shrank or this is first read, replay from zero. Otherwise read only new bytes.
  if (stat.size < state.size) state.size = 0;
  if (stat.size === state.size) return state;

  // For simplicity in v1, re-read whole file. JSONLs are small (<2 MB typical, occasionally 10 MB).
  // Optimize to incremental tail in v2 if scan time becomes a bottleneck.
  const records = await readWholeFile(filepath);
  state.totals = { tokens: 0, tools: 0, lastTimestamp: null, model: null, contextTokens: 0 };
  state.turnLog = [];
  for (const r of records) processRecord(state, r);
  state.size = stat.size;
  return state;
}

export async function scanAllSessions() {
  let entries = [];
  try {
    entries = await fsp.readdir(PATHS.jsonlDir);
  } catch (e) {
    log.warn("jsonl: cannot read jsonlDir", PATHS.jsonlDir, e.message);
    return [];
  }
  const jsonls = entries.filter(n => n.endsWith(".jsonl"));
  const out = [];
  for (const name of jsonls) {
    const state = await scanFile(path.join(PATHS.jsonlDir, name)).catch(e => {
      log.warn("jsonl: scan failed", name, e.message);
      return null;
    });
    if (state) out.push({ sessionId: path.basename(name, ".jsonl"), ...state });
  }
  return out;
}

// Roll up sessions into per-agent telemetry. Picks the most recently active session per agent.
export function rollupByAgent(sessionStates) {
  const byAgent = new Map();
  for (const s of sessionStates) {
    if (!s.agentId) continue;
    const prev = byAgent.get(s.agentId);
    const prevTs = prev?.totals.lastTimestamp || "";
    const currTs = s.totals.lastTimestamp || "";
    if (!prev || currTs > prevTs) byAgent.set(s.agentId, s);
  }
  return byAgent;
}

// Today's totals (UTC midnight cutoff). Sums all sessions whose last activity is today.
export function todayTotals(sessionStates) {
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
  const cutoff = todayStart.toISOString();
  let tokens = 0, tools = 0, sessionsLive = 0;
  for (const s of sessionStates) {
    const ts = s.totals.lastTimestamp || "";
    if (ts >= cutoff) {
      tokens += s.totals.tokens;
      tools  += s.totals.tools;
      // "Live" heuristic: last activity within 5 minutes.
      const age = Date.now() - new Date(ts).getTime();
      if (age < 5 * 60 * 1000) sessionsLive += 1;
    }
  }
  return { tokens, tools, sessionsLive };
}

// Tokens-per-minute across all sessions, computed from the 60-second rolling window
// of per-turn cumulative deltas. Each session's turnLog is sorted by ingest order;
// delta_i = cum_i - cum_{i-1} (delta_0 = cum_0). Sum deltas whose timestamp falls
// within the last 60 seconds.
export function tokensPerMinAll(sessionStates, now = Date.now()) {
  const windowMs = 60 * 1000;
  let sum = 0;
  for (const s of sessionStates) {
    const log = s.turnLog || [];
    let prev = 0;
    for (const turn of log) {
      const delta = Math.max(0, turn.cum - prev);
      prev = turn.cum;
      const ageMs = now - new Date(turn.at).getTime();
      if (ageMs >= 0 && ageMs <= windowMs) sum += delta;
    }
  }
  return sum;
}
