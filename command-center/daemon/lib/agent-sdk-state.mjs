import fs from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../config.mjs";
import { log } from "./log.mjs";

const STATE_DIR = path.join(PATHS.stateDir, "agent-sdk");

const FILES = {
  currentTask: "current_task.json",
  recentActions: "recent_actions.jsonl",
  pendingApprovals: "pending_approvals.json",
  contextSummary: "context_summary.md",
};

async function statFile(file) {
  try {
    return await fs.stat(path.join(STATE_DIR, file));
  } catch (e) {
    if (e.code === "ENOENT") return null;
    log.warn("agent-sdk-state: stat failed", e.message);
    return null;
  }
}

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(path.join(STATE_DIR, file), "utf8");
    return JSON.parse(raw);
  } catch (e) {
    if (e.code !== "ENOENT") log.warn("agent-sdk-state: json read failed", `${file}: ${e.message}`);
    return fallback;
  }
}

async function readText(file) {
  try {
    return await fs.readFile(path.join(STATE_DIR, file), "utf8");
  } catch (e) {
    if (e.code !== "ENOENT") log.warn("agent-sdk-state: text read failed", `${file}: ${e.message}`);
    return "";
  }
}

async function readJsonlTail(file, limit) {
  try {
    const raw = await fs.readFile(path.join(STATE_DIR, file), "utf8");
    const lines = raw.split(/\n+/).filter(Boolean).slice(-limit);
    const out = [];
    for (const line of lines) {
      try { out.push(JSON.parse(line)); } catch {}
    }
    return out;
  } catch (e) {
    if (e.code !== "ENOENT") log.warn("agent-sdk-state: jsonl read failed", `${file}: ${e.message}`);
    return [];
  }
}

function normalizePendingApprovals(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.approvals)) return raw.approvals;
  return [];
}

export async function loadAgentSdkState() {
  const stats = Object.fromEntries(
    await Promise.all(Object.entries(FILES).map(async ([key, file]) => [key, await statFile(file)]))
  );

  const missingFiles = Object.entries(FILES)
    .filter(([key]) => !stats[key])
    .map(([, file]) => file);

  const [currentTask, recentActions, pendingRaw, contextSummary] = await Promise.all([
    readJson(FILES.currentTask, null),
    readJsonlTail(FILES.recentActions, 5),
    readJson(FILES.pendingApprovals, []),
    readText(FILES.contextSummary),
  ]);

  const pendingApprovals = normalizePendingApprovals(pendingRaw);
  const cachedPendingCount = Number.isInteger(currentTask?.pending_approval_count)
    ? currentTask.pending_approval_count
    : pendingApprovals.length;
  const mtimes = Object.values(stats)
    .filter(Boolean)
    .map((s) => s.mtimeMs);
  const lastUpdatedAt = mtimes.length > 0 ? new Date(Math.max(...mtimes)).toISOString() : null;

  return {
    stateDir: STATE_DIR,
    exists: missingFiles.length < Object.keys(FILES).length,
    missingFiles,
    currentTask,
    recentActions,
    pendingApprovals,
    pendingApprovalsCount: cachedPendingCount,
    contextSummaryPreview: contextSummary.trim().slice(0, 700),
    contextSummaryUpdatedAt: stats.contextSummary ? stats.contextSummary.mtime.toISOString() : null,
    lastUpdatedAt,
  };
}
