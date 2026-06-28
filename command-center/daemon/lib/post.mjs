// POST /api/post handler.
// Writes three artifacts on every user broadcast:
//   1. broadcast file at  09 — VaultBus/20 — Commands/broadcast/<ts>.md
//   2. per-mention inbox file at 09 — VaultBus/20 — Commands/inbox/<slug>/<ts>_broadcast.md
//   3. append to 09 — VaultBus/30 — Chat/messages.jsonl (canonical chat log)
//
// Returns the written message envelope so the frontend can reconcile its
// optimistic update against the canonical record on the next snapshot.

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { PATHS, AGENT_ROSTER } from "../config.mjs";
import { log } from "./log.mjs";
import { onChatPost as harnessOnChatPost, redactCredentials } from "./harness.mjs";

const VALID_PRIORITIES = new Set(["info", "attention", "interrupt"]);

// Universal Credentials Rule (CLAUDE.md): credentials NEVER in chat output.
// Pre-write scan rejects posts containing any credential family pattern. The
// rejection error names the family but never echoes the value, so the error
// itself is safe to log + return to the client.
function assertNoCredentials(body) {
  if (!body) return;
  const { redacted, families } = redactCredentials(body);
  if (redacted) {
    const err = new Error(`credential pattern detected in post body (${families.join(", ")}). Universal Credentials Rule: redact at the source before posting. The value was NOT logged.`);
    err.statusCode = 400;
    throw err;
  }
}

const BROADCAST_DIR = path.join(PATHS.vaultRoot, "09 — VaultBus", "20 — Commands", "broadcast");
const CHAT_DIR = path.join(PATHS.vaultRoot, "09 — VaultBus", "30 — Chat");
const CHAT_LOG = path.join(CHAT_DIR, "messages.jsonl");
const ROUTES_LOG = path.join(CHAT_DIR, "routes.jsonl");
const ATTACHMENTS_DIR = path.join(CHAT_DIR, "attachments");
const THREADS_DIR = path.join(CHAT_DIR, "threads");

const BUILTIN_THREAD_ROUTES = {};

const CHANNEL_ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

const SAFE_NAME = /[^a-zA-Z0-9._-]+/g;

const MIME_BY_EXT = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
};

const ALLOWED_MIME = new Set(Object.values(MIME_BY_EXT));

const ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024; // 8 MB per attachment

function safeBaseName(name) {
  const base = path.basename(String(name || "image"));
  const cleaned = base.replace(SAFE_NAME, "_").slice(0, 80);
  return cleaned || "image";
}

async function writeAttachments(ts, list) {
  if (!Array.isArray(list) || list.length === 0) return [];
  await fs.mkdir(ATTACHMENTS_DIR, { recursive: true });
  const out = [];
  for (const att of list) {
    if (!att || typeof att !== "object") continue;
    const mime = String(att.mime || "").toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      const err = new Error(`unsupported attachment mime: ${mime || "(missing)"}; allowed: ${Array.from(ALLOWED_MIME).join(", ")}`);
      err.statusCode = 415;
      throw err;
    }
    const data = String(att.dataBase64 || "");
    if (!data) {
      const err = new Error("attachment.dataBase64 required");
      err.statusCode = 400;
      throw err;
    }
    const buf = Buffer.from(data, "base64");
    if (buf.length === 0 || buf.length > ATTACHMENT_MAX_BYTES) {
      const err = new Error(`attachment size out of range (${buf.length} bytes; max ${ATTACHMENT_MAX_BYTES})`);
      err.statusCode = 413;
      throw err;
    }
    const id = `${tsForFile(ts)}_${Math.random().toString(36).slice(2, 8)}`;
    const safe = safeBaseName(att.name);
    const filename = `${id}_${safe}`;
    const fullPath = path.join(ATTACHMENTS_DIR, filename);
    await fs.writeFile(fullPath, buf);
    out.push({ name: filename, mime, size: buf.length, url: `/api/attachments/${encodeURIComponent(filename)}` });
  }
  return out;
}

export function attachmentsDir() { return ATTACHMENTS_DIR; }
export function mimeByExt(ext) { return MIME_BY_EXT[ext.toLowerCase()] || "application/octet-stream"; }

function tsForFile(date) {
  const iso = date.toISOString().replace(/[:.]/g, "-");
  return iso.slice(0, 19);
}

function displayClockFromTs(tsValue, fallback = "") {
  if (!tsValue) return fallback;
  const date = new Date(tsValue);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toTimeString().slice(0, 8);
}

function normalizeChatRecord(record) {
  if (!record || typeof record !== "object") return record;
  return {
    ...record,
    timestamp: displayClockFromTs(record.ts, record.timestamp),
  };
}

// @team / @everyone / @all expand to every agent in the roster. the owner asked
// for "tag every agent" 2026-04-30. Single token, server-side fan-out.
const TEAM_TOKENS = new Set(["team", "everyone", "all"]);

function slugifyMention(token, roster) {
  const lower = token.toLowerCase();
  const hit = roster.find((a) => a.id === lower || a.name.toLowerCase().startsWith(lower));
  return hit ? hit.slug : null;
}

function parseMentions(body, mentions) {
  const out = new Set();
  const explicit = Array.isArray(mentions) ? mentions : [];
  for (const m of explicit) {
    const lower = String(m).toLowerCase();
    if (TEAM_TOKENS.has(lower)) {
      AGENT_ROSTER.forEach((a) => out.add(a.slug));
      continue;
    }
    const slug = slugifyMention(m, AGENT_ROSTER);
    if (slug) out.add(slug);
  }
  const re = /@(\w+)/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    const lower = match[1].toLowerCase();
    if (TEAM_TOKENS.has(lower)) {
      AGENT_ROSTER.forEach((a) => out.add(a.slug));
      continue;
    }
    const slug = slugifyMention(match[1], AGENT_ROSTER);
    if (slug) out.add(slug);
  }
  return Array.from(out);
}

function slugForAgentId(id) {
  return AGENT_ROSTER.find((a) => a.id === id)?.slug || null;
}

function normalizeChannelId(payload) {
  const raw = payload?.channelId ?? payload?.threadId ?? "main";
  const channelId = String(raw || "main").trim().toLowerCase();
  if (!CHANNEL_ID_RE.test(channelId)) {
    const err = new Error(`invalid channelId '${raw}'. Use lowercase letters, numbers, dot, underscore, or hyphen.`);
    err.statusCode = 400;
    throw err;
  }
  return channelId;
}

function mentionAgentIds(body, mentions) {
  const out = new Set();
  const candidates = new Set([
    ...(Array.isArray(mentions) ? mentions : []),
    ...Array.from(body.matchAll(/@(\w+)/g)).map((m) => m[1]),
  ]);
  for (const c of candidates) {
    const lower = String(c).toLowerCase();
    if (TEAM_TOKENS.has(lower)) {
      AGENT_ROSTER.forEach((a) => out.add(a.id));
      continue;
    }
    const hit = AGENT_ROSTER.find((a) => a.id === lower || a.name.toLowerCase().startsWith(lower));
    if (hit) out.add(hit.id);
  }
  return Array.from(out);
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function writeBroadcast(ts, body, agentIdsRouted, authorLabel) {
  await ensureDir(BROADCAST_DIR);
  const file = path.join(BROADCAST_DIR, `${tsForFile(ts)}.md`);
  const routedLine = agentIdsRouted.length === 0 ? "all agents" : agentIdsRouted.join(", ");
  const md = `---
ts: ${ts.toISOString()}
author: ${authorLabel}
routed: ${routedLine}
---

${body}
`;
  await fs.writeFile(file, md, "utf8");
  return file;
}

async function writeThreadFile(ts, body, agentIdsRouted, authorLabel, channelId) {
  const dir = path.join(THREADS_DIR, channelId);
  await ensureDir(dir);
  const file = path.join(dir, `${tsForFile(ts)}.md`);
  const routedLine = agentIdsRouted.length === 0 ? "none" : agentIdsRouted.join(", ");
  const md = `---
ts: ${ts.toISOString()}
author: ${authorLabel}
threadId: ${channelId}
routed: ${routedLine}
---

${body}
`;
  await fs.writeFile(file, md, "utf8");
  return file;
}

async function writeInboxFiles(ts, body, slugsRouted, authorLabel, channelId) {
  const written = [];
  const kind = channelId === "main" ? "broadcast" : "thread";
  for (const slug of slugsRouted) {
    const dir = path.join(PATHS.inboxRoot, slug);
    await ensureDir(dir);
    const suffix = channelId === "main" ? "broadcast" : channelId;
    const file = path.join(dir, `${tsForFile(ts)}_${suffix}.md`);
    const md = `---
ts: ${ts.toISOString()}
from: ${authorLabel}
kind: ${kind}
threadId: ${channelId}
---

${body}
`;
    await fs.writeFile(file, md, "utf8");
    written.push(file);
  }
  return written;
}

// Resolve the author for this post.
// REQUIRED field. Accepts BOTH `authorId` (canonical, used by the frontend) and
// `author` (the field name documented in CLAUDE.md Rule 14 for agent curl posts).
// Match against agent id (e.g. "agent-one"), slug, or display name
// case-insensitive. "me" / "owner" identifies the human user from
// the Command Center UI. Missing field returns 400 to prevent silent attribution
// to the owner when an agent forgets to identify itself.
function resolveAuthor(payload) {
  const raw = payload?.authorId ?? payload?.author;
  if (raw == null || String(raw).trim() === "") {
    const err = new Error("author required: pass 'me' (UI) or an agent id/slug (e.g. 'agent-one' or 'agent-two'). Field name accepted: 'authorId' or 'author'.");
    err.statusCode = 400;
    throw err;
  }
  const id = String(raw).trim().toLowerCase();
  if (id === "me" || id === "owner") {
    return { authorId: "me", authorLabel: process.env.AGOS_OWNER_LABEL || "owner" };
  }
  const hit = AGENT_ROSTER.find(
    (a) => a.id === id || a.slug === id || a.name.toLowerCase() === id
  );
  if (!hit) {
    const err = new Error(`unknown author: ${raw}. Valid: ${AGENT_ROSTER.map((a) => `${a.id} (slug=${a.slug})`).join(", ")}`);
    err.statusCode = 400;
    throw err;
  }
  return { authorId: hit.id, authorLabel: hit.name };
}

async function appendChatLog(record) {
  await ensureDir(CHAT_DIR);
  await fs.appendFile(CHAT_LOG, JSON.stringify(record) + "\n", "utf8");
}

// Fire a macOS notification + system sound on every the owner post and every
// directed inter-agent post. Best-effort: errors swallowed, daemon never blocks.
// Disable by setting env AGOS_CC_NOTIFY=0 in the launchd plist.
function fireDesktopNotification(authorLabel, body, agentIdsRouted) {
  if (process.env.AGOS_CC_NOTIFY === "0") return;
  if (process.platform !== "darwin") return;
  try {
    const preview = body.slice(0, 140).replace(/[\r\n]+/g, " ").replace(/"/g, "\\\"").replace(/\\/g, "\\\\");
    const target = agentIdsRouted.length === 0 ? "all agents" : agentIdsRouted.join(", ");
    const title = `Group chat: ${authorLabel}`;
    const subtitle = `→ ${target}`;
    const script = `display notification "${preview}" with title "${title.replace(/"/g, "\\\"")}" subtitle "${subtitle.replace(/"/g, "\\\"")}" sound name "Glass"`;
    const child = spawn("/usr/bin/osascript", ["-e", script], { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();
  } catch (e) {
    log.warn("notify: fire failed", e.message);
  }
}

// Routing log: one record per directed post (skips broadcasts-to-all where toAgentIds is empty).
// Schema: { ts, fromAuthorId, toAgentIds: string[], messageId }.
// Source for snapshot.edges[] in Phase 4. Append-only, never trimmed.
async function appendRouteLog(record) {
  if (!Array.isArray(record?.toAgentIds) || record.toAgentIds.length === 0) return;
  await ensureDir(CHAT_DIR);
  await fs.appendFile(ROUTES_LOG, JSON.stringify(record) + "\n", "utf8");
}

export async function handlePost(payload) {
  const body = String(payload?.body ?? "").trim();
  const hasAttachments = Array.isArray(payload?.attachments) && payload.attachments.length > 0;
  if (!body && !hasAttachments) {
    const err = new Error("body or attachments required");
    err.statusCode = 400;
    throw err;
  }
  if (body.length > 8000) {
    const err = new Error("body exceeds 8000 chars");
    err.statusCode = 413;
    throw err;
  }

  const ts = payload?.at ? new Date(payload.at) : new Date();
  if (Number.isNaN(ts.getTime())) {
    const err = new Error("invalid 'at' timestamp");
    err.statusCode = 400;
    throw err;
  }

  // Universal Credentials Rule: scan the body before any disk write.
  // Reject (don't auto-redact) so the human sees the gap and fixes the source.
  assertNoCredentials(body);

  const { authorId, authorLabel } = resolveAuthor(payload);
  const channelId = normalizeChannelId(payload);

  // Optional priority field (harness v1). Default = info. Same string appears
  // in BOTH the broadcast frontmatter (when written by harness) AND this
  // messages.jsonl record so frontend/poll-broadcast/ack-matcher all agree.
  let priority = "info";
  if (payload && payload.priority != null) {
    const p = String(payload.priority).toLowerCase();
    if (!VALID_PRIORITIES.has(p)) {
      const err = new Error(`invalid priority '${payload.priority}'; valid: ${Array.from(VALID_PRIORITIES).join(", ")}`);
      err.statusCode = 400;
      throw err;
    }
    priority = p;
  }

  const defaultAgentIds = BUILTIN_THREAD_ROUTES[channelId] || [];
  const authorSlug = authorId === "me" ? null : slugForAgentId(authorId);
  const slugsRouted = Array.from(new Set([
    ...parseMentions(body, payload?.mentions),
    ...defaultAgentIds.map(slugForAgentId).filter(Boolean),
  ])).filter((slug) => slug !== authorSlug);
  const agentIdsRouted = Array.from(new Set([
    ...defaultAgentIds,
    ...mentionAgentIds(body, payload?.mentions),
  ])).filter((id) => id !== authorId);

  const attachments = await writeAttachments(ts, payload?.attachments);

  const id = `m_${ts.getTime()}_${Math.random().toString(36).slice(2, 7)}`;
  const record = {
    id,
    channelId,
    authorId,
    body,
    mentions: agentIdsRouted,
    routedTo: agentIdsRouted,
    toolCalls: [],
    timestamp: ts.toTimeString().slice(0, 8),
    ts: ts.toISOString(),
    attachments,
    priority,
  };

  const chatFile = channelId === "main"
    ? await writeBroadcast(ts, body, agentIdsRouted, authorLabel)
    : await writeThreadFile(ts, body, agentIdsRouted, authorLabel, channelId);
  const inboxFiles = await writeInboxFiles(ts, body, slugsRouted, authorLabel, channelId);
  await appendChatLog(record);
  await appendRouteLog({
    ts: ts.toISOString(),
    fromAuthorId: authorId,
    toAgentIds: agentIdsRouted,
    messageId: id,
    channelId,
  });

  fireDesktopNotification(authorLabel, body, agentIdsRouted);

  // Harness v1 hook: synthetic signal emitter. Never throws into the post path,
  // never delays the response. Errors land in harness_errors.log only.
  if (channelId === "main") {
    try {
      await harnessOnChatPost(record, body);
    } catch (e) {
      log.warn("harness: onChatPost threw", e.message);
    }
  }

  log.info(`post: author=${authorId} channel=${channelId} artifact=${path.basename(chatFile)} inbox=${inboxFiles.length} attachments=${attachments.length} routed=${agentIdsRouted.length === 0 ? "all" : agentIdsRouted.join(",")} priority=${priority}`);

  return record;
}

export async function readChatLog(limit = 200) {
  try {
    const raw = await fs.readFile(CHAT_LOG, "utf8");
    const lines = raw.split(/\n+/).filter(Boolean);
    const tail = lines.slice(-limit);
    const out = [];
    for (const line of tail) {
      try { out.push(normalizeChatRecord(JSON.parse(line))); } catch {}
    }
    return out;
  } catch (e) {
    if (e.code === "ENOENT") return [];
    log.warn("readChatLog:", e.message);
    return [];
  }
}

export async function readRouteLog(limit = 500) {
  try {
    const raw = await fs.readFile(ROUTES_LOG, "utf8");
    const lines = raw.split(/\n+/).filter(Boolean);
    const tail = lines.slice(-limit);
    const out = [];
    for (const line of tail) {
      try { out.push(JSON.parse(line)); } catch {}
    }
    return out;
  } catch (e) {
    if (e.code === "ENOENT") return [];
    log.warn("readRouteLog:", e.message);
    return [];
  }
}
