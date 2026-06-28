// Harness v1 — auto-awareness + interrupt for the agent fleet.
// CC v5, 2026-05-03. Spec: 09 — VaultBus/20 — Commands/inbox/command-center-agent/2026-05-02_harness_v1_spec.md
//
// Provider-neutral signal pipeline. Every event references agent_id (the slug
// from AGENT_ROSTER), not the underlying model or runtime. Claude Code agents
// and Codex (and future runtimes) ship through the same paths.
//
// Surface contract:
//   start({ getSnapshot })       -> begin watching, restore state
//   stop()                        -> halt timers, flush state
//   onChatPost(record, body)      -> called by post.mjs after every successful post
//   pendingSummary()              -> { byAgent: {agent_id: count}, total }
//
// Persisted state lives in daemon/state/harness/.

import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  PATHS,
  AGENT_ROSTER,
  HARNESS,
  HARNESS_URGENCY_MARKERS,
  HARNESS_PEER_URGENCY_PHRASES,
} from "../config.mjs";
import { log } from "./log.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(__dirname, "..", "state", "harness");
const PENDING_FILE = path.join(STATE_DIR, "pending_alerts.json");
const RATE_LIMIT_FILE = path.join(STATE_DIR, "rate_limit_buckets.json");
const DELIVERY_LOG = path.join(STATE_DIR, "delivery_attempts.log");
const ACKS_LOG = path.join(STATE_DIR, "acks.log");

const BROADCAST_DIR = path.join(PATHS.vaultRoot, "09 — VaultBus", "20 — Commands", "broadcast");
const CHAT_DIR = path.join(PATHS.vaultRoot, "09 — VaultBus", "30 — Chat");
const CHAT_LOG = path.join(CHAT_DIR, "messages.jsonl");

const ERROR_LOG = path.join(PATHS.vaultRoot, "..", "Operations", "Logs", "harness_errors.log");
const CRED_BLOCK_LOG = path.join(PATHS.vaultRoot, "..", "Operations", "Logs", "harness_credential_blocks.log");

// Credential shapes redacted from chat excerpts so a pasted secret never
// renders in the UI or a harness notification. Extend to match your own secrets.
const CREDENTIAL_PATTERNS = [
  { name: "cwt_watcher_token",      regex: /cwt_[a-f0-9]{16,}/g },
  { name: "github_pat_classic",     regex: /ghp_[A-Za-z0-9]{36}/g },
  { name: "github_pat_finegrained", regex: /github_pat_[A-Za-z0-9_]{82}/g },
  { name: "openai_anthropic_sk",    regex: /sk-[A-Za-z0-9]{20,}/g },
  { name: "slack_token",            regex: /xox[baprs]-[A-Za-z0-9-]+/g },
  { name: "aws_access_key",         regex: /AKIA[0-9A-Z]{16}/g },
  { name: "jwt_shaped",             regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
];

const CREDENTIAL_ALLOWLIST = new Set([
  "cwt_REDACTED", "cwt_your_token_here", "cwt_xxx", "YOUR_TOKEN_HERE",
  "ghp_REDACTED", "github_pat_REDACTED", "sk-REDACTED",
]);

// Stopwords for relevance tokenizer. Short list, plain English. Anything <4 chars
// is also discarded so we don't match on "the", "and", "for", etc. without a list.
const STOPWORDS = new Set([
  "this","that","with","from","have","your","what","when","then","just","like",
  "into","over","also","they","them","there","their","about","still","while",
  "very","need","needs","more","much","than","some","make","made","must","want",
  "where","which","could","would","should","every","each","other","been","being",
  "going","gone","know","take","took","yeah","sure","okay","good","nice","fine",
]);

// In-memory state (persisted to disk on every mutation).
const state = {
  pending: {},      // event_id -> stored alert payload
  rateLimits: {},   // agent_id -> last interrupt ts (epoch ms)
  enabled: HARNESS.enabled,
  loopGuardSet: new Set(),  // ids we've already processed to short-circuit
  lastTickAt: 0,
};

let intervalHandle = null;
let getSnapshotFn = null;

// --- ULID-ish event ids ---------------------------------------------------
const ULID_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function ulid() {
  let s = "";
  let t = Date.now();
  for (let i = 0; i < 10; i++) { s = ULID_CHARS[t % 32] + s; t = Math.floor(t / 32); }
  for (let i = 0; i < 16; i++) { s += ULID_CHARS[Math.floor(Math.random() * 32)]; }
  return s;
}
function newEventId() { return `evt_${ulid()}`; }

// --- credential redaction (mandatory pre-write) ---------------------------
function stripCodeFences(text) {
  if (!text) return "";
  let out = String(text);
  out = out.replace(/```[\s\S]*?```/g, " ");
  out = out.replace(/~~~[\s\S]*?~~~/g, " ");
  out = out.replace(/`+/g, "");
  return out;
}

function redactCredentials(text) {
  if (!text) return { text: "", redacted: false, families: [] };
  let out = String(text);
  let redacted = false;
  const families = new Set();
  for (const { name, regex } of CREDENTIAL_PATTERNS) {
    out = out.replace(regex, (match) => {
      if (CREDENTIAL_ALLOWLIST.has(match)) return match;
      redacted = true;
      families.add(name);
      return "<REDACTED>";
    });
  }
  return { text: out, redacted, families: Array.from(families) };
}

// Build the 200-char excerpt per spec: strip code fences -> redact -> truncate.
// Truncation is LAST so we never cut mid-redaction.
function buildExcerpt(rawBody) {
  const stripped = stripCodeFences(rawBody);
  const { text, redacted, families } = redactCredentials(stripped);
  const truncated = text.length > 200 ? text.slice(0, 200) + "…" : text;
  return { excerpt: truncated, credentialsRedacted: redacted, redactedFamilies: families };
}

// --- path scope guard -----------------------------------------------------
function allowedWritePrefixes() {
  return [
    path.resolve(BROADCAST_DIR),
    path.resolve(PATHS.inboxRoot),
    path.resolve(STATE_DIR),
    path.resolve(CHAT_LOG),         // for ack appends
    path.resolve(path.dirname(ERROR_LOG)),
    path.resolve(path.dirname(CRED_BLOCK_LOG)),
  ];
}

export function assertAllowedWrite(targetPath) {
  const norm = path.resolve(targetPath);
  for (const prefix of allowedWritePrefixes()) {
    if (norm === prefix || norm.startsWith(prefix + path.sep)) return;
  }
  const err = new Error(`harness: write to ${targetPath} blocked by path scope`);
  err.code = "EHARNESSPATH";
  throw err;
}

// --- error + audit logging ------------------------------------------------
async function logHarnessError(where, err) {
  try {
    await fsp.mkdir(path.dirname(ERROR_LOG), { recursive: true });
    const line = `${new Date().toISOString()} harness ${where}: ${err && err.message ? err.message : err}\n`;
    await fsp.appendFile(ERROR_LOG, line, "utf8");
  } catch {}
}

async function logCredentialBlock(eventId, families) {
  try {
    await fsp.mkdir(path.dirname(CRED_BLOCK_LOG), { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), eventId, families }) + "\n";
    await fsp.appendFile(CRED_BLOCK_LOG, line, "utf8");
  } catch {}
}

// --- state persistence ----------------------------------------------------
async function ensureStateDir() { await fsp.mkdir(STATE_DIR, { recursive: true }); }

async function loadState() {
  try {
    const raw = await fsp.readFile(PENDING_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) state.pending = parsed;
  } catch (e) { if (e.code !== "ENOENT") log.warn("harness: pending load failed", e.message); }
  try {
    const raw = await fsp.readFile(RATE_LIMIT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) state.rateLimits = parsed;
  } catch (e) { if (e.code !== "ENOENT") log.warn("harness: rate-limit load failed", e.message); }
}

async function persistPending() {
  await ensureStateDir();
  const target = PENDING_FILE;
  assertAllowedWrite(target);
  await fsp.writeFile(target, JSON.stringify(state.pending, null, 2) + "\n", "utf8");
}

async function persistRateLimits() {
  await ensureStateDir();
  const target = RATE_LIMIT_FILE;
  assertAllowedWrite(target);
  await fsp.writeFile(target, JSON.stringify(state.rateLimits, null, 2) + "\n", "utf8");
}

async function appendDeliveryLog(line) {
  await ensureStateDir();
  assertAllowedWrite(DELIVERY_LOG);
  await fsp.appendFile(DELIVERY_LOG, JSON.stringify(line) + "\n", "utf8");
}

async function appendAckLog(line) {
  await ensureStateDir();
  assertAllowedWrite(ACKS_LOG);
  await fsp.appendFile(ACKS_LOG, JSON.stringify(line) + "\n", "utf8");
}

// --- timestamps -----------------------------------------------------------
function tsForFile(date) {
  const iso = date.toISOString().replace(/[:.]/g, "-");
  return iso.slice(0, 19);
}

// --- relevance check (structural, two-of-three) ---------------------------
function tokenize(text) {
  if (!text) return new Set();
  const out = new Set();
  const words = String(text).toLowerCase().match(/[a-z][a-z0-9_-]{3,}/g) || [];
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    out.add(w);
  }
  return out;
}

function intersects(setA, setB) {
  for (const v of setA) if (setB.has(v)) return true;
  return false;
}

async function loadAgentProjectTokens(agentId) {
  const folder = SESSION_FOLDER_BY_ID[agentId];
  if (!folder) return new Set();
  const file = path.join(PATHS.sessionsDir, folder, "projects.json");
  try {
    const raw = await fsp.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.projects) ? parsed.projects : [];
    const tokens = new Set();
    for (const p of list) {
      if (typeof p?.title === "string") for (const t of tokenize(p.title)) tokens.add(t);
    }
    return tokens;
  } catch { return new Set(); }
}

async function loadAgentInboxTokens(slug, limit = 5) {
  const dir = path.join(PATHS.inboxRoot, slug);
  try {
    const entries = await fsp.readdir(dir);
    const mds = entries.filter((n) => n.endsWith(".md") && !n.startsWith("."));
    // Newest first by name (timestamps prefix in our naming convention).
    mds.sort().reverse();
    const tokens = new Set();
    for (const name of mds.slice(0, limit)) {
      // Strip ts prefix and .md suffix; tokenize remainder.
      const base = name.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}T?[\d-]*_?/, "");
      for (const t of tokenize(base.replace(/[_\-]/g, " "))) tokens.add(t);
    }
    return tokens;
  } catch { return new Set(); }
}

function loadAgentRecentChatTokens(agentId, recentMessages, limit = 3) {
  const slug = (AGENT_ROSTER.find((a) => a.id === agentId) || {}).slug;
  const tokens = new Set();
  if (!Array.isArray(recentMessages)) return tokens;
  // Walk newest-first to take the last N where this agent was sender or in mentions.
  let taken = 0;
  for (let i = recentMessages.length - 1; i >= 0 && taken < limit; i--) {
    const m = recentMessages[i];
    if (!m) continue;
    const isSender = m.authorId === agentId;
    const inMentions = Array.isArray(m.mentions) && m.mentions.includes(agentId);
    if (!isSender && !inMentions) continue;
    for (const t of tokenize(m.body)) tokens.add(t);
    taken++;
  }
  return tokens;
}

// Map agent.id -> session folder name. Mirrors projects.mjs.
const SESSION_FOLDER_BY_ID = {
  "agent-one":   "Agent One",
  "agent-two":   "Agent Two",
  "agent-three": "Agent Three",
  "agent-four":  "Agent Four",
};

// --- urgency detection -----------------------------------------------------
function hasOwnerUrgency(body) {
  if (!body) return false;
  const lower = String(body).toLowerCase();
  for (const phrase of HARNESS_URGENCY_MARKERS) {
    // word-boundary match for single tokens, substring for multi-word phrases
    if (phrase.includes(" ")) { if (lower.includes(phrase)) return true; }
    else { if (new RegExp(`\\b${phrase}\\b`).test(lower)) return true; }
  }
  return false;
}

function hasPeerUrgency(body) {
  if (!body) return false;
  const lower = String(body).toLowerCase();
  for (const phrase of HARNESS_PEER_URGENCY_PHRASES) {
    if (lower.includes(phrase)) return true;
  }
  return false;
}

// --- ack detection ---------------------------------------------------------
const EVENT_ID_RX = /\bevent_id\s*[:=]\s*(evt_[A-Z0-9]{20,32})\b/i;
const EVENT_ID_BARE_RX = /\b(evt_[A-Z0-9]{20,32})\b/;
const ACK_STATUS_RX = /\bstatus\s*[:=]\s*(ack|ack_no_impact|ack_deferred)\b/i;

function extractAck(body) {
  if (!body) return null;
  const idMatch = EVENT_ID_RX.exec(body) || EVENT_ID_BARE_RX.exec(body);
  if (!idMatch) return null;
  const event_id = idMatch[1] || idMatch[0];
  const statusMatch = ACK_STATUS_RX.exec(body);
  const status = statusMatch ? statusMatch[1].toLowerCase() : "ack";
  return { event_id, status };
}

// --- Mac notification (fire-and-forget) -----------------------------------
function notifyMac(title, message, subtitle = "") {
  if (process.platform !== "darwin") return;
  if (process.env.AGOS_CC_NOTIFY === "0") return;
  try {
    const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ").slice(0, 240);
    const script = `display notification "${esc(message)}" with title "${esc(title)}" subtitle "${esc(subtitle)}" sound name "Glass"`;
    const c = spawn("/usr/bin/osascript", ["-e", script], { stdio: "ignore", detached: true });
    c.on("error", () => {});
    c.unref();
  } catch (e) { logHarnessError("notifyMac", e); }
}

// Wake spawn script: clipboard + AppleScript path that opens Claude.app, opens
// a new chat, pastes the boot prompt + wake context. Default = no auto-submit
// so the owner hits return himself for the final eyeball.
const WAKE_SCRIPT = path.join(PATHS.vaultRoot, "..", "Operations", "scripts", "wake_agent.sh");
// Agent ids that should never be auto-woken via the local wake script (e.g. agents
// running outside this machine). Add your own; empty by default.
const CLAUDE_WAKE_EXCLUDED_AGENT_IDS = new Set([]);

function canUseClaudeWake(agentId) {
  return !CLAUDE_WAKE_EXCLUDED_AGENT_IDS.has(agentId);
}

// Approval-gated dialog for dormant wake. Async. On Approve, runs the spawn
// script which clipboard-pastes the boot prompt into a new Claude.app chat.
// CC v5 phase-one wake-failure follow-up 2026-05-03: previously this opened
// the boot prompt in Finder for manual paste, which still required the owner to
// be the bottleneck. Now Approve = real spawn.
function notifyApprovalDialog(title, message, bootPromptPath, wakeContext) {
  if (process.platform !== "darwin") return;
  if (process.env.AGOS_CC_NOTIFY === "0") return;
  try {
    const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]+/g, " ").slice(0, 240);
    const script = `display dialog "${esc(message)}\n\nApprove = spawn this agent now (paste auto, you press return)." with title "${esc(title)}" buttons {"Skip", "Spawn"} default button "Spawn" giving up after 60`;
    const child = spawn("/usr/bin/osascript", ["-e", script], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (c) => { out += c.toString(); });
    child.on("close", () => {
      if (out.includes("Spawn") && bootPromptPath) {
        try {
          const sp = spawn("/bin/bash", [WAKE_SCRIPT, bootPromptPath, wakeContext || "WAKE: harness signal"], { stdio: "ignore", detached: true });
          sp.on("error", (e) => logHarnessError("wake spawn", e));
          sp.unref();
        } catch (e) { logHarnessError("wake spawn", e); }
      }
    });
    child.on("error", () => {});
    child.unref();
  } catch (e) { logHarnessError("notifyApprovalDialog", e); }
}

// --- writers (path-scope-guarded) -----------------------------------------
async function writeHarnessBroadcast(payload) {
  const ts = new Date(payload.ts);
  const file = path.join(BROADCAST_DIR, `${tsForFile(ts)}_HARNESS_${payload.event_id}.md`);
  assertAllowedWrite(file);
  await fsp.mkdir(BROADCAST_DIR, { recursive: true });
  const md = `---
ts: ${payload.ts}
from: harness
priority: ${payload.priority}
event_id: ${payload.event_id}
to_agent_id: ${payload.to_agent_id}
source_message_id: ${payload.source_message?.id || ""}
ack_required_by_ms: ${payload.ack_required_by_ms}
---

**${payload.priority.toUpperCase()} — ${payload.to_agent_id}**

**Reason:** ${payload.reason}

**Expected action:** ${payload.expected_action}

**Context:**
${(payload.context_note || []).map((b) => `- ${b}`).join("\n")}

**Source excerpt (${payload.source_message?.author || "unknown"}):**
${payload.source_message?.excerpt || "(empty)"}

ack with: \`event_id: ${payload.event_id}\` plus \`status: ack | ack_no_impact | ack_deferred\`
`;
  await fsp.writeFile(file, md, "utf8");
  return file;
}

async function writeHarnessInbox(slug, payload) {
  const ts = new Date(payload.ts);
  const dir = path.join(PATHS.inboxRoot, slug);
  const file = path.join(dir, `${tsForFile(ts)}_HARNESS_${payload.event_id}.md`);
  assertAllowedWrite(file);
  await fsp.mkdir(dir, { recursive: true });
  const md = `---
ts: ${payload.ts}
from: harness
kind: harness_signal
priority: ${payload.priority}
event_id: ${payload.event_id}
ack_required_by_ms: ${payload.ack_required_by_ms}
---

**${payload.priority.toUpperCase()}** from harness for **${payload.to_agent_id}**

**Reason:** ${payload.reason}

**Expected action:** ${payload.expected_action}

**Context:**
${(payload.context_note || []).map((b) => `- ${b}`).join("\n")}

**Source excerpt (${payload.source_message?.author || "unknown"}):**
${payload.source_message?.excerpt || "(empty)"}

To ack: post in chat (or write a broadcast file) containing \`event_id: ${payload.event_id}\` and \`status: ack | ack_no_impact | ack_deferred\` plus an optional one-line note.
`;
  await fsp.writeFile(file, md, "utf8");
  return file;
}

async function writeHarnessWakeNote(slug, payload, bootPromptPath) {
  const ts = new Date(payload.ts);
  const dir = path.join(PATHS.inboxRoot, slug);
  const file = path.join(dir, `${tsForFile(ts)}_HARNESS_WAKE_${payload.event_id}.md`);
  assertAllowedWrite(file);
  await fsp.mkdir(dir, { recursive: true });
  const md = `---
ts: ${payload.ts}
from: harness
kind: harness_wake
priority: ${payload.priority}
event_id: ${payload.event_id}
boot_prompt: ${bootPromptPath || ""}
---

**WAKE REQUEST** for **${payload.to_agent_id}**

This agent has no active session (jsonl idle > ${Math.round(HARNESS.dormantThresholdMs / 60000)} min). Originating event: \`${payload.event_id}\`.

**Reason:** ${payload.reason}

**Expected action:** ${payload.expected_action}

**Context:**
${(payload.context_note || []).map((b) => `- ${b}`).join("\n")}

**Boot prompt to paste into a fresh Claude.app session:**
\`${bootPromptPath || "(no canonical boot prompt found, see 05 — Sessions)"}\`

**Source excerpt (${payload.source_message?.author || "unknown"}):**
${payload.source_message?.excerpt || "(empty)"}
`;
  await fsp.writeFile(file, md, "utf8");
  return file;
}

async function appendHarnessChatRecord(payload) {
  // Keep messages.jsonl shape compatible with post.mjs records so the frontend
  // and snapshot.readChatLog don't choke. authorId="harness" is the synthetic
  // signal author; frontend can hide it via filter.
  await fsp.mkdir(CHAT_DIR, { recursive: true });
  assertAllowedWrite(CHAT_LOG);
  const ts = new Date(payload.ts);
  const id = `m_${ts.getTime()}_${payload.event_id.slice(-5).toLowerCase()}`;
  const body = `**[${payload.priority}]** for **@${payload.to_agent_id}** — ${payload.reason}\n\n_event_id: ${payload.event_id}_`;
  const record = {
    id,
    channelId: "main",
    authorId: "harness",
    body,
    mentions: [payload.to_agent_id],
    routedTo: [payload.to_agent_id],
    toolCalls: [],
    timestamp: ts.toTimeString().slice(0, 8),
    ts: payload.ts,
    attachments: [],
    priority: payload.priority,
    event_id: payload.event_id,
  };
  await fsp.appendFile(CHAT_LOG, JSON.stringify(record) + "\n", "utf8");
  return record;
}

// --- canonical payload constructor ----------------------------------------
function buildPayload({ to_agent_id, priority, sourceRecord, sourceBody, reason, expected_action, context_note }) {
  const event_id = newEventId();
  const ts = new Date().toISOString();
  const { excerpt, credentialsRedacted, redactedFamilies } = buildExcerpt(sourceBody);
  return {
    event_id,
    ts,
    from: "harness",
    to_agent_id,
    priority,
    source_message: {
      id: sourceRecord?.id || "",
      author: sourceRecord?.authorId || "",
      excerpt,
    },
    reason,
    expected_action,
    context_note: Array.isArray(context_note) ? context_note.slice(0, 3) : [],
    ack_required_by_ms: HARNESS.ackRequiredByMs,
    rate_limit_bucket: to_agent_id,
    _credentialsRedacted: credentialsRedacted,
    _redactedFamilies: redactedFamilies,
    acked: false,
    ackStatus: null,
    escalated: false,
    deliveryAttempts: 0,
  };
}

// --- emitter --------------------------------------------------------------
function rateLimited(agentId) {
  const last = state.rateLimits[agentId] || 0;
  return Date.now() - last < HARNESS.rateLimitPerAgentMs;
}

async function emitSignal(payload) {
  // Loop guard: never act on harness-authored sources.
  if (payload.source_message?.author === "harness") return;

  // Per-agent rate limit on interrupts only. attention/info are always allowed.
  if (payload.priority === "interrupt" && rateLimited(payload.to_agent_id)) {
    log.info(`harness: rate-limited ${payload.to_agent_id} interrupt (last < ${HARNESS.rateLimitPerAgentMs}ms ago)`);
    return;
  }

  const cred = payload._credentialsRedacted;
  const families = payload._redactedFamilies || [];
  if (cred) await logCredentialBlock(payload.event_id, families);

  const slug = (AGENT_ROSTER.find((a) => a.id === payload.to_agent_id) || {}).slug;
  if (!slug) {
    log.warn(`harness: no slug for agent ${payload.to_agent_id}, skipping`);
    return;
  }

  // Persist pending before any disk write so a mid-write crash leaves a record.
  state.pending[payload.event_id] = payload;
  await persistPending();

  // Attempt delivery: broadcast file + per-agent inbox file + chat record.
  let delivered = false;
  try {
    await writeHarnessBroadcast(payload);
    await writeHarnessInbox(slug, payload);
    await appendHarnessChatRecord(payload);
    delivered = true;
    payload.deliveryAttempts = 1;
    await appendDeliveryLog({ event_id: payload.event_id, agent_id: payload.to_agent_id, attempt: 1, ts: new Date().toISOString(), outcome: "ok" });
  } catch (e) {
    payload.deliveryAttempts = 1;
    await appendDeliveryLog({ event_id: payload.event_id, agent_id: payload.to_agent_id, attempt: 1, ts: new Date().toISOString(), outcome: "error", error: e.message });
    await logHarnessError("emitSignal write", e);
  }

  // Dormant-agent wake check uses the live snapshot.
  try {
    const snap = getSnapshotFn ? await getSnapshotFn() : null;
    const target = snap?.agents?.find((a) => a.id === payload.to_agent_id);
    if (target && isDormant(target)) {
      if (!HARNESS.wakeEnabled) {
        await appendDeliveryLog({
          event_id: payload.event_id,
          agent_id: payload.to_agent_id,
          attempt: 1,
          ts: new Date().toISOString(),
          outcome: "wake_skipped_disabled",
        });
        return;
      }
      if (!canUseClaudeWake(payload.to_agent_id)) {
        await appendDeliveryLog({
          event_id: payload.event_id,
          agent_id: payload.to_agent_id,
          attempt: 1,
          ts: new Date().toISOString(),
          outcome: "wake_skipped_runtime",
        });
        return;
      }
      const bootPath = await findCanonicalBootPrompt(payload.to_agent_id);
      await writeHarnessWakeNote(slug, payload, bootPath);
      const wakeContext = `WAKE — ${payload.reason}\n\nOriginating event_id: ${payload.event_id}\nSource (${payload.source_message?.author || "unknown"}): ${payload.source_message?.excerpt || "(empty)"}\n\nAddress this immediately in chat (post your ack with the event_id).`;
      if (HARNESS.wakeRequiresApproval) {
        notifyApprovalDialog(`Wake ${target.name}?`, `${payload.reason}`, bootPath, wakeContext);
      } else {
        // Auto-spawn (HARNESS_WAKE_REQUIRES_APPROVAL=false): bypass dialog,
        // run wake script directly. Also fire a notification so the owner knows.
        notifyMac(`Spawning ${target.name}`, payload.reason);
        try {
          const sp = spawn("/bin/bash", [WAKE_SCRIPT, bootPath, wakeContext], { stdio: "ignore", detached: true });
          sp.on("error", (e) => logHarnessError("auto wake spawn", e));
          sp.unref();
        } catch (e) { await logHarnessError("auto wake spawn", e); }
      }
    }
  } catch (e) { await logHarnessError("emitSignal wake", e); }

  if (delivered && payload.priority === "interrupt") {
    state.rateLimits[payload.to_agent_id] = Date.now();
    await persistRateLimits();
  }
}

function isDormant(agent) {
  if (!agent) return true;
  if (!agent.sessionId) return true;
  if (!agent.lastActiveAt) return true;
  const age = Date.now() - new Date(agent.lastActiveAt).getTime();
  return age > HARNESS.dormantThresholdMs;
}

async function findCanonicalBootPrompt(agentId) {
  const folder = SESSION_FOLDER_BY_ID[agentId];
  if (!folder) return null;
  const dir = path.join(PATHS.sessionsDir, folder);
  try {
    const entries = await fsp.readdir(dir);
    const candidates = entries
      .filter((n) => /^BOOT_PROMPT_v\d+\.md$/.test(n) || /^OPERATING_PROMPT\.md$/.test(n))
      .sort()
      .reverse();
    if (candidates.length === 0) return null;
    return path.join(dir, candidates[0]);
  } catch { return null; }
}

// --- public: onChatPost ---------------------------------------------------
// Called by post.mjs after every successful post. Decides whether to:
//   1. Match an outstanding ack and clear the pending alert (always).
//   2. Emit harness signals (only if enabled and source is not harness itself).
export async function onChatPost(record, body) {
  if (!record || typeof record !== "object") return;
  if (record.authorId === "harness") return; // loop guard

  // Step 1: ack matching always runs (cheap, applies even when harness disabled
  // so that mid-disable acks don't get lost when re-enabling).
  const ack = extractAck(body);
  if (ack) {
    const pending = state.pending[ack.event_id];
    if (pending) {
      pending.acked = true;
      pending.ackStatus = ack.status;
      pending.ackBy = record.authorId;
      pending.ackedAt = record.ts;
      await persistPending();
      await appendAckLog({
        event_id: ack.event_id,
        agent_id: record.authorId,
        status: ack.status,
        ts: record.ts,
        message_id: record.id,
      });
      log.info(`harness: ack matched event=${ack.event_id} by=${record.authorId} status=${ack.status}`);
      // Clearing the pending entry on ack keeps state file lean. The acks log
      // preserves the audit trail.
      delete state.pending[ack.event_id];
      await persistPending();
      return; // an ack post is not a relevance source itself
    }
  }

  if (!state.enabled) return;

  // The owner is the only sender that triggers explicit-mention elevations in v1.
  // Agent-to-agent posts use peer-urgency only.
  const isOwner = record.authorId === "me" || record.authorId === "owner";

  // Cap outbound signals per source post (loop / explosion defense).
  let emitted = 0;
  const cap = HARNESS.maxOutboundPerPost;
  const explicit = Array.isArray(record.mentions) ? record.mentions : [];

  // Step 2a: explicit @mentions (the owner).
  if (isOwner && explicit.length > 0) {
    const interrupt = hasOwnerUrgency(body);
    for (const agentId of explicit) {
      if (emitted >= cap) break;
      const priority = interrupt ? "interrupt" : "attention";
      const reason = interrupt
        ? `the owner said "${shortPhraseHit(body, HARNESS_URGENCY_MARKERS) || "stop"}" with @${agentId}.`
        : `the owner @${agentId} in chat.`;
      const expected_action = interrupt
        ? "pause your current work, post an ack with the event_id, then address this."
        : "review this before continuing your current task. ack with the event_id.";
      const payload = buildPayload({
        to_agent_id: agentId,
        priority,
        sourceRecord: record,
        sourceBody: body,
        reason,
        expected_action,
        context_note: [
          `What changed: the owner posted in chat targeting @${agentId}.`,
          `Why it might affect you: explicit mention with ${interrupt ? "urgency markers" : "no urgency markers"}.`,
          `Suggested action: ${interrupt ? "stop current step" : "scan the source post"} and reply in chat with the event_id.`,
        ],
      });
      await emitSignal(payload);
      emitted++;
    }
  }

  // Step 2b: agent-to-agent peer urgency (NOT the owner path).
  if (!isOwner && explicit.length > 0 && hasPeerUrgency(body)) {
    for (const agentId of explicit) {
      if (emitted >= cap) break;
      if (agentId === record.authorId) continue;
      const payload = buildPayload({
        to_agent_id: agentId,
        priority: "interrupt",
        sourceRecord: record,
        sourceBody: body,
        reason: `${record.authorId} flagged work that may impact you (@${agentId}).`,
        expected_action: "review the source post and ack with the event_id.",
        context_note: [
          `What changed: ${record.authorId} flagged peer-impact in chat.`,
          `Why it might affect you: explicit @${agentId} with peer-urgency phrase.`,
          `Suggested action: pause if your current step is affected, then ack.`,
        ],
      });
      await emitSignal(payload);
      emitted++;
    }
  }

  // Step 2c: implicit relevance (the owner, no explicit mentions).
  // Two-of-three structural checks (projects.json titles, last 5 inbox files,
  // last 3 chat posts). Conservative threshold.
  if (isOwner && explicit.length === 0) {
    const bodyTokens = tokenize(body);
    if (bodyTokens.size === 0) return;
    const recentMessages = await readRecentChatTail(50);
    for (const a of AGENT_ROSTER) {
      if (emitted >= cap) break;
      if (a.id === "harness") continue;
      const projectTokens = await loadAgentProjectTokens(a.id);
      const inboxTokens = await loadAgentInboxTokens(a.slug, 5);
      const chatTokens = loadAgentRecentChatTokens(a.id, recentMessages, 3);
      const A = intersects(bodyTokens, projectTokens);
      const B = intersects(bodyTokens, inboxTokens);
      const C = intersects(bodyTokens, chatTokens);
      const score = (A ? 1 : 0) + (B ? 1 : 0) + (C ? 1 : 0);
      if (score < 2) continue;
      const payload = buildPayload({
        to_agent_id: a.id,
        priority: "attention",
        sourceRecord: record,
        sourceBody: body,
        reason: `the owner's post matches ${score}/3 structural signals for @${a.id}.`,
        expected_action: "scan the source post; ack with the event_id whether or not action is needed.",
        context_note: [
          `What changed: the owner posted in chat (no @mention).`,
          `Why it might affect you: matched ${score}/3 of {projects, inbox, recent chat}.`,
          `Suggested action: read the excerpt and ack with status: ack_no_impact if it does not affect your work.`,
        ],
      });
      await emitSignal(payload);
      emitted++;
    }
  }
}

function shortPhraseHit(body, list) {
  if (!body) return null;
  const lower = String(body).toLowerCase();
  for (const p of list) if (lower.includes(p)) return p;
  return null;
}

// --- recent chat reader (tail-only) ---------------------------------------
async function readRecentChatTail(limit = 50) {
  try {
    const raw = await fsp.readFile(CHAT_LOG, "utf8");
    const lines = raw.split(/\n+/).filter(Boolean);
    const tail = lines.slice(-limit);
    const out = [];
    for (const line of tail) {
      try { out.push(JSON.parse(line)); } catch {}
    }
    return out;
  } catch { return []; }
}

// --- tick: no-ack escalation ----------------------------------------------
async function tick() {
  state.lastTickAt = Date.now();
  if (!state.enabled) return;
  let mutated = false;
  for (const [event_id, payload] of Object.entries(state.pending)) {
    if (payload.acked || payload.escalated) continue;
    const age = Date.now() - new Date(payload.ts).getTime();
    const ceiling = payload.priority === "interrupt"
      ? HARNESS.noAckInterruptMs
      : payload.priority === "attention" ? HARNESS.noAckAttentionMs : Infinity;
    if (age >= ceiling) {
      const agentName = (AGENT_ROSTER.find((a) => a.id === payload.to_agent_id) || {}).name || payload.to_agent_id;
      notifyMac(`${agentName} hasn't acked`, `${payload.reason}`, `event ${event_id}`);
      payload.escalated = true;
      payload.escalatedAt = new Date().toISOString();
      mutated = true;
    }
  }
  if (mutated) await persistPending();
}

// --- lifecycle ------------------------------------------------------------
export async function start({ getSnapshot } = {}) {
  getSnapshotFn = typeof getSnapshot === "function" ? getSnapshot : null;
  await ensureStateDir();
  await loadState();
  if (intervalHandle) clearInterval(intervalHandle);
  if (state.enabled) {
    intervalHandle = setInterval(() => {
      tick().catch((e) => logHarnessError("tick", e));
    }, HARNESS.tickMs);
    intervalHandle.unref?.();
    log.info(`harness: started (tick=${HARNESS.tickMs}ms, ack-interrupt=${HARNESS.noAckInterruptMs}ms)`);
  } else {
    log.info("harness: disabled by config (HARNESS_ENABLED=false)");
  }
}

export function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  log.info("harness: stopped");
}

// Kill switch flip at runtime (used by tests + smoke).
// Per spec: disable clears in-memory timers, leaves on-disk state intact.
// Re-enable restores from the on-disk state (reloads pending + rate limits).
export async function setEnabled(flag) {
  const next = !!flag;
  if (state.enabled === next) return;
  state.enabled = next;
  if (!next) {
    if (intervalHandle) { clearInterval(intervalHandle); intervalHandle = null; }
    log.info("harness: disabled at runtime; on-disk state untouched");
  } else {
    // Reload state from disk so an external test or operator can wipe the
    // pending file then toggle to get a clean in-memory view.
    state.pending = {};
    state.rateLimits = {};
    await loadState();
    intervalHandle = setInterval(() => {
      tick().catch((e) => logHarnessError("tick", e));
    }, HARNESS.tickMs);
    intervalHandle.unref?.();
    log.info("harness: re-enabled at runtime; state reloaded from disk");
  }
}

export function pendingSummary() {
  const byAgent = {};
  let total = 0;
  for (const p of Object.values(state.pending)) {
    if (p.acked) continue;
    byAgent[p.to_agent_id] = (byAgent[p.to_agent_id] || 0) + 1;
    total++;
  }
  return { byAgent, total, enabled: state.enabled };
}

// Test seam: clear all pending + rate-limit state. Used by smoke runner.
export async function _resetForTests() {
  state.pending = {};
  state.rateLimits = {};
  await persistPending();
  await persistRateLimits();
}

// Test seam: get full state snapshot.
export function _peekState() {
  return { pending: { ...state.pending }, rateLimits: { ...state.rateLimits }, enabled: state.enabled };
}

// Re-export for tests / external use.
export { buildExcerpt, redactCredentials, stripCodeFences, extractAck, hasOwnerUrgency };
