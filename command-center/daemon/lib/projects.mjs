// Projects feed (Phase 2.5).
// Reads <sessionsDir>/<Agent>/projects.json per agent and assembles
// snapshot.projects[] + snapshot.edges[].
//
// Schema (one file per agent):
// {
//   "ownerAgentId": "agent-one",
//   "projects": [
//     {
//       "id": "j_v13_recall",                     // unique across all agents
//       "title": "Hit recall@5 = 90%",
//       "status": "blocked",                       // in-flight | blocked | planned | done
//       "kpis": [{ "label": "Recall@5", "value": "69%" }],
//       "blockers": ["sec_zshenv_anthropic_key"],  // ids referencing other agents' projects
//       "vaultPath": "05 — Sessions/AI Stack/BOOT_PROMPT_v13.md",
//       "lastSyncedAt": "2026-04-26",
//       "conflict": false
//     }
//   ]
// }
//
// File-not-found is fine; that agent simply contributes no projects this snapshot.
// Edges are derived from each project's blockers[] array; a blocker id that
// resolves to a different ownerAgentId is a cross-agent edge.

import fsp from "node:fs/promises";
import path from "node:path";
import { PATHS, AGENT_ROSTER } from "../config.mjs";
import { log } from "./log.mjs";

const SESSION_FOLDER_BY_ID = {
  "agent-one":   "Agent One",
  "agent-two":   "Agent Two",
  "agent-three": "Agent Three",
  "agent-four":  "Agent Four",
};

const VALID_STATUSES = new Set(["in-flight", "blocked", "planned", "done"]);

function normalizeProject(raw, ownerAgentId) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.title !== "string" || !raw.title) return null;
  const status = VALID_STATUSES.has(raw.status) ? raw.status : "planned";
  return {
    id: raw.id,
    ownerAgentId,
    title: raw.title,
    status,
    lastSyncedAt: typeof raw.lastSyncedAt === "string" ? raw.lastSyncedAt : "",
    vaultPath: typeof raw.vaultPath === "string" ? raw.vaultPath : "",
    kpis: Array.isArray(raw.kpis)
      ? raw.kpis
          .filter((k) => k && typeof k.label === "string" && (typeof k.value === "string" || typeof k.value === "number"))
          .map((k) => ({ label: k.label, value: String(k.value) }))
      : [],
    blockers: Array.isArray(raw.blockers) ? raw.blockers.filter((b) => typeof b === "string") : [],
    conflict: !!raw.conflict,
  };
}

async function loadOneAgentProjects(agentId) {
  const folder = SESSION_FOLDER_BY_ID[agentId];
  if (!folder) return [];
  const file = path.join(PATHS.sessionsDir, folder, "projects.json");
  let raw;
  try {
    raw = await fsp.readFile(file, "utf8");
  } catch (e) {
    if (e.code !== "ENOENT") log.warn(`projects: read ${agentId} failed`, e.message);
    return [];
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    log.warn(`projects: parse ${agentId} failed`, e.message);
    return [];
  }
  const list = Array.isArray(parsed?.projects) ? parsed.projects : [];
  const ownerAgentId = parsed?.ownerAgentId || agentId;
  const out = [];
  for (const r of list) {
    const p = normalizeProject(r, ownerAgentId);
    if (p) out.push(p);
  }
  return out;
}

export async function loadAllProjects() {
  const all = [];
  for (const a of AGENT_ROSTER) {
    const list = await loadOneAgentProjects(a.id);
    all.push(...list);
  }
  return all;
}

// buildEdges(projects, routes?) merges two edge sources:
//   - "blocker": project.blockers[] -> {from: blockerProjectId, to: projectId, source: "blocker"}
//   - "route":   chat post @mentions -> {from: fromAuthorId, to: toAgentId, source: "route"}
// Dedup by (from, to, source). Same (from, to) pair under different sources is preserved.
export function buildEdges(projects, routes = []) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const seen = new Set();
  const edges = [];
  const push = (edge) => {
    const key = `${edge.from}${edge.to}${edge.source}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(edge);
  };
  for (const p of projects) {
    for (const b of p.blockers) {
      if (byId.has(b)) push({ from: b, to: p.id, source: "blocker" });
    }
  }
  for (const r of routes) {
    if (!r || typeof r.fromAuthorId !== "string") continue;
    const tos = Array.isArray(r.toAgentIds) ? r.toAgentIds : [];
    for (const to of tos) {
      if (typeof to !== "string" || !to) continue;
      if (to === r.fromAuthorId) continue; // self-mention is not a directed edge
      push({ from: r.fromAuthorId, to, source: "route" });
    }
  }
  return edges;
}
