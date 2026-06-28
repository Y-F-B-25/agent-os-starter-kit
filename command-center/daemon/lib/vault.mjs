// Vault reader. Surfaces inbox counts, latest handoff per agent, agent presence.
// Watcher emits a change signal via a callback; consumers re-snapshot.

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { PATHS, AGENT_ROSTER, DEBOUNCE_MS } from "../config.mjs";
import { log } from "./log.mjs";

export async function inboxCount(slug) {
  const dir = path.join(PATHS.inboxRoot, slug);
  try {
    const entries = await fsp.readdir(dir);
    return entries.filter(n => n.endsWith(".md") && !n.startsWith(".")).length;
  } catch {
    return 0;
  }
}

export async function latestSessionFile(agentName) {
  // sessions live at <sessionsDir>/<Display Name>/
  const dir = path.join(PATHS.sessionsDir, agentName);
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    const files = entries.filter(e => e.isFile() && e.name.endsWith(".md"));
    if (!files.length) return null;
    // pick newest by mtime
    let newest = null, newestMtime = 0;
    for (const f of files) {
      const stat = await fsp.stat(path.join(dir, f.name)).catch(() => null);
      if (stat && stat.mtimeMs > newestMtime) {
        newestMtime = stat.mtimeMs;
        newest = f.name;
      }
    }
    return newest;
  } catch {
    return null;
  }
}

// Map config agent.id -> the session folder name under <sessionsDir>.
// Define one entry per agent in your roster. If a folder does not exist for an
// agent, session-file lookup is simply skipped. Example entries below.
const SESSION_FOLDER_BY_ID = {
  "agent-one":   "Agent One",
  "agent-two":   "Agent Two",
  "agent-three": "Agent Three",
};

export async function snapshotAgentVaultState() {
  const out = {};
  for (const a of AGENT_ROSTER) {
    const slug = a.slug;
    const folder = SESSION_FOLDER_BY_ID[a.id];
    out[a.id] = {
      inboxCount: await inboxCount(slug),
      latestSessionFile: folder ? await latestSessionFile(folder) : null,
    };
  }
  return out;
}

// Naive recursive watcher with debounce. fs.watch on macOS is FSEvents-backed and recursive
// works with `{ recursive: true }`. We watch a few key roots and merge events.
export function startWatcher(onChange) {
  const watchTargets = [
    PATHS.sessionsDir,
    PATHS.inboxRoot,
    PATHS.brainIndex,
    PATHS.jsonlDir,
  ];

  let timer = null;
  const debounced = (label) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try { onChange(label); } catch (e) { log.warn("watcher: onChange threw", e.message); }
    }, DEBOUNCE_MS);
  };

  const watchers = [];
  for (const target of watchTargets) {
    try {
      const stat = fs.statSync(target);
      const opts = stat.isDirectory() ? { recursive: true, persistent: true } : { persistent: true };
      const w = fs.watch(target, opts, (eventType, filename) => {
        debounced(`${path.basename(target)}:${filename || eventType}`);
      });
      w.on("error", e => log.warn("watcher: error on", target, e.message));
      watchers.push(w);
      log.info("watcher: watching", target);
    } catch (e) {
      log.warn("watcher: cannot watch", target, e.message);
    }
  }
  return () => watchers.forEach(w => { try { w.close(); } catch {} });
}
