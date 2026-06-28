// Centralized paths and constants. Single source of truth.
//
// PORTABLE TEMPLATE. Every path is driven by an environment variable with a
// sensible local default, so you can run this with zero edits by setting a few
// vars (see .env.example), or fork this file for your own layout.
//
// Nothing here is secret. Point AGOS_PROJECT_ROOT at your own workspace and
// define your own AGENT_ROSTER + AGENT_FINGERPRINTS below.

import os from "node:os";
import path from "node:path";

const HOME = os.homedir();

// Root of your workspace. Override with AGOS_PROJECT_ROOT.
export const PROJECT_ROOT = process.env.AGOS_PROJECT_ROOT || path.join(HOME, "AgentOS");

const VAULT_ROOT = process.env.AGOS_VAULT_ROOT || path.join(PROJECT_ROOT, "vault");

export const PATHS = {
  vaultRoot:    VAULT_ROOT,
  sessionsDir:  process.env.AGOS_SESSIONS_DIR || path.join(VAULT_ROOT, "Sessions"),
  inboxRoot:    process.env.AGOS_INBOX_ROOT   || path.join(VAULT_ROOT, "VaultBus", "Commands", "inbox"),
  brainIndex:   process.env.AGOS_BRAIN_INDEX  || path.join(VAULT_ROOT, "INDEX.md"),
  // Where your Claude Code session JSONLs live. Override per machine.
  jsonlDir:     process.env.AGOS_JSONL_DIR    || path.join(HOME, ".claude", "projects"),
  logDir:       process.env.AGOS_LOG_DIR      || path.join(PROJECT_ROOT, "logs", "cc-daemon"),
  // Per-agent SDK state (current task, recent actions, approvals). Optional.
  stateDir:     process.env.AGOS_STATE_DIR    || path.join(path.dirname(new URL(import.meta.url).pathname), "state"),
};

export const PORT = Number(process.env.AGOS_CC_PORT || 8787);

// Human owner label, shown when the person (not an agent) posts from the UI.
export const OWNER_LABEL = process.env.AGOS_OWNER_LABEL || "owner";

// ---------------------------------------------------------------------------
// EXAMPLE roster. Replace these with your own agents.
// `id` is the canonical key. `slug` is the inbox folder name under inboxRoot.
// `hueVar` is a CSS color token defined in frontend/src/styles.css (--ag-1..--ag-7).
// `contextWindowSize` drives the context-percent gauge.
export const AGENT_ROSTER = [
  { id: "agent-one",   name: "Agent One",   role: "Orchestrator · coordinates the fleet", hueVar: "--ag-1", slug: "agent-one",   contextWindowSize: 1_000_000 },
  { id: "agent-two",   name: "Agent Two",   role: "Builder · ships the work",             hueVar: "--ag-2", slug: "agent-two",   contextWindowSize: 1_000_000 },
  { id: "agent-three", name: "Agent Three", role: "Researcher · gathers and verifies",    hueVar: "--ag-3", slug: "agent-three", contextWindowSize: 1_000_000 },
  { id: "agent-four",  name: "Agent Four",  role: "Reviewer · checks and hardens",        hueVar: "--ag-4", slug: "agent-four",  contextWindowSize: 200_000 },
];

// Boot-prompt fingerprints map a Claude Code session JSONL to an agent.
// We scan early user messages for these needles. Most specific first; first match wins.
// Convention: line 1 of each agent's boot prompt is "You are <Agent Name> v<N>, <role>."
export const AGENT_FINGERPRINTS = [
  { id: "agent-one",   needle: "You are Agent One v" },
  { id: "agent-two",   needle: "You are Agent Two v" },
  { id: "agent-three", needle: "You are Agent Three v" },
  { id: "agent-four",  needle: "You are Agent Four v" },
];

export const DEBOUNCE_MS = 250;
export const SNAPSHOT_REFRESH_MS = 5_000;

// Harness v1: auto-awareness + interrupt for the agent fleet.
// All values overridable via env so you can tune without code edits.
export const HARNESS = {
  enabled:                  process.env.HARNESS_ENABLED !== "false",
  // Dormant wake opens spawn dialogs. Default off.
  wakeEnabled:              process.env.HARNESS_WAKE_ENABLED === "true",
  noAckInterruptMs:         Number(process.env.HARNESS_NO_ACK_INTERRUPT_MS || 5 * 60 * 1000),
  noAckAttentionMs:         Number(process.env.HARNESS_NO_ACK_ATTENTION_MS || 15 * 60 * 1000),
  wakeRequiresApproval:     process.env.HARNESS_WAKE_REQUIRES_APPROVAL !== "false",
  rateLimitPerAgentMs:      Number(process.env.HARNESS_RATE_LIMIT_PER_AGENT_MS || 60 * 1000),
  dormantThresholdMs:       Number(process.env.HARNESS_DORMANT_MS || 30 * 60 * 1000),
  maxOutboundPerPost:       Number(process.env.HARNESS_MAX_OUTBOUND_PER_POST || 5),
  tickMs:                   Number(process.env.HARNESS_TICK_MS || 500),
  ackRequiredByMs:          Number(process.env.HARNESS_ACK_REQUIRED_BY_MS || 5 * 60 * 1000),
};

// Urgency markers the owner uses when something must stop or change paths.
// Plain English, lowercase, whole-word matched.
export const HARNESS_URGENCY_MARKERS = [
  "stop", "wait", "wrong path", "pause", "halt", "abort",
  "drop everything", "hold on", "stop everything",
];

// Agent-to-agent urgency phrases. Conservative; adds attention only.
export const HARNESS_PEER_URGENCY_PHRASES = [
  "may impact your work", "affects your", "blocking you",
  "you need to", "please pause",
];
