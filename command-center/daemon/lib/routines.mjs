// Routines feed (Phase 5). Reads daemon/state/routines.json which is generated
// by your own routines manifest generator (see AGOS_ROUTINES_ENRICHMENT).
//
// Manifest schema covers TWO kinds in one list:
//   - kind: "launchd" — local LaunchAgents (telemetry, frontend, chat-poll, etc.)
//     fields: id, label, schedule, program, logPath, errPath, status, pid,
//             lastExitStatus, lastRun, plistPath
//   - kind: "scheduled-task" — Anthropic scheduled tasks (cron-style routines)
//     fields: id, label, schedule, description, logPath, status, lastRun,
//             skillPath
//
// We normalize both into a uniform Routine shape for the snapshot. The frontend
// renders launchd vs scheduled-task with subtle visual distinction.

import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECT_ROOT } from "../config.mjs";
import { log } from "./log.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTINES_FILE = path.join(__dirname, "..", "state", "routines.json");
// CC v4 enrichment side file: live data (lastRun, nextRunAt, cron, label
// overrides) pulled from a scheduled-tasks source. The base manifest generator
// may lack runtime info, so we merge it
// here at snapshot build time.
const ENRICHMENT_FILE = process.env.AGOS_ROUTINES_ENRICHMENT || path.join(PROJECT_ROOT, "routines_enrichment.json");
const ENRICHMENT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function normalizeRoutine(r) {
  if (!r || typeof r !== "object" || typeof r.id !== "string") return null;
  return {
    id: r.id,
    kind: r.kind === "launchd" ? "launchd" : "scheduled-task",
    label: String(r.label || r.id),
    schedule: String(r.schedule || ""),
    description: String(r.description || r.program || ""),
    status: String(r.status || "unknown"),
    enabled: r.status !== "stopped" && r.status !== "disabled",
    pid: typeof r.pid === "number" ? r.pid : null,
    lastExitStatus: typeof r.lastExitStatus === "number" ? r.lastExitStatus : null,
    lastRun: typeof r.lastRun === "string" ? r.lastRun : null,
    nextRunAt: typeof r.nextRunAt === "string" ? r.nextRunAt : null,
    program: typeof r.program === "string" ? r.program : "",
    logPath: typeof r.logPath === "string" ? r.logPath : null,
    errPath: typeof r.errPath === "string" ? r.errPath : null,
    plistPath: typeof r.plistPath === "string" ? r.plistPath : null,
    skillPath: typeof r.skillPath === "string" ? r.skillPath : null,
  };
}

async function loadEnrichment() {
  try {
    const raw = await fsp.readFile(ENRICHMENT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      labelOverrides: (parsed?.labelOverrides && typeof parsed.labelOverrides === "object") ? parsed.labelOverrides : {},
      byId: (parsed?.byId && typeof parsed.byId === "object") ? parsed.byId : {},
      fetchedAt: parsed?._meta?.fetchedAt || "",
    };
  } catch (e) {
    if (e.code !== "ENOENT") log.warn("routines enrichment: load failed", e.message);
    return { labelOverrides: {}, byId: {}, fetchedAt: "" };
  }
}

function isFreshIso(ts) {
  if (!ts) return false;
  const parsed = Date.parse(ts);
  if (Number.isNaN(parsed)) return false;
  const age = Date.now() - parsed;
  return age >= 0 && age <= ENRICHMENT_MAX_AGE_MS;
}

function applyEnrichment(routine, enrichment) {
  const enrich = enrichment.byId[routine.id];
  const labelOverride = enrichment.labelOverrides[routine.id];
  return {
    ...routine,
    label: labelOverride || routine.label,
    lastRun: enrich?.lastRun || routine.lastRun,
    nextRunAt: enrich?.nextRunAt || routine.nextRunAt,
    schedule: enrich?.scheduleHuman || routine.schedule,
    cronExpression: enrich?.cronExpression || "",
  };
}

// Synthesize a Routine from an enrichment-only entry (no base in the
// manifest). Surfaces new routines on the dashboard without waiting for
// the manifest generator to refresh.
function synthesizeFromEnrichment(id, e) {
  if (!e || typeof e !== "object") return null;
  return {
    id,
    kind: e.kind === "launchd" ? "launchd" : "scheduled-task",
    label: String(e.label || id),
    schedule: String(e.scheduleHuman || ""),
    description: String(e.description || ""),
    status: String(e.status || "registered"),
    enabled: e.enabled === false ? false : true,
    pid: null,
    lastExitStatus: null,
    lastRun: typeof e.lastRun === "string" ? e.lastRun : null,
    nextRunAt: typeof e.nextRunAt === "string" ? e.nextRunAt : null,
    cronExpression: typeof e.cronExpression === "string" ? e.cronExpression : "",
    program: "",
    logPath: null,
    errPath: null,
    plistPath: null,
    skillPath: null,
  };
}

export async function loadRoutines() {
  try {
    const [raw, enrichment] = await Promise.all([
      fsp.readFile(ROUTINES_FILE, "utf8").catch(() => "{}"),
      loadEnrichment(),
    ]);
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.routines) ? parsed.routines : [];
    const meta = parsed?._meta || {};
    const normalized = list.map(normalizeRoutine).filter(Boolean);
    const freshEnrichment = isFreshIso(enrichment.fetchedAt)
      ? enrichment
      : { labelOverrides: enrichment.labelOverrides, byId: {}, fetchedAt: enrichment.fetchedAt };
    const enriched = normalized.map((r) => applyEnrichment(r, freshEnrichment));
    // Synthesize routines that exist ONLY in the enrichment file (not yet in
    // the manifest). Lets CC surface new routines immediately.
    const baseIds = new Set(normalized.map((r) => r.id));
    const extras = [];
    for (const [id, e] of Object.entries(freshEnrichment.byId)) {
      if (baseIds.has(id)) continue;
      const synth = synthesizeFromEnrichment(id, e);
      if (synth) extras.push(synth);
    }
    const all = [...enriched, ...extras].sort((a, b) => {
      // launchd first, then scheduled-tasks; alphabetical within each kind
      if (a.kind !== b.kind) return a.kind === "launchd" ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
    return {
      lastFetchedAt: typeof meta.generatedAt === "string" ? meta.generatedAt : "",
      fetchedBy: typeof meta.generator === "string" ? meta.generator : "",
      enrichmentFetchedAt: freshEnrichment.fetchedAt,
      routines: all,
    };
  } catch (e) {
    if (e.code !== "ENOENT") log.warn("routines: load failed", e.message);
    return { lastFetchedAt: "", fetchedBy: "", enrichmentFetchedAt: "", routines: [] };
  }
}

export function routinesFile() { return ROUTINES_FILE; }
export function enrichmentFile() { return ENRICHMENT_FILE; }
