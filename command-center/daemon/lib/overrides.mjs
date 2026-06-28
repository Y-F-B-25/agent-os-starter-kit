// Agent name overrides. Lets the user rename specialists from the dashboard
// without editing config.mjs / restarting the daemon. Persisted as JSON, watched
// implicitly via fs.watch on the daemon dir; loaded fresh on every snapshot build.
//
// Schema: { "<agent_id>": "<display name>" }   (empty string clears override)

import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "./log.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(__dirname, "..", "state");
const FILE = path.join(STATE_DIR, "name_overrides.json");

export async function loadOverrides() {
  try {
    const raw = await fsp.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    return {};
  } catch (e) {
    if (e.code !== "ENOENT") log.warn("overrides: read failed", e.message);
    return {};
  }
}

export async function setOverride(agentId, name) {
  await fsp.mkdir(STATE_DIR, { recursive: true });
  const current = await loadOverrides();
  if (!name) {
    delete current[agentId];
  } else {
    current[agentId] = name;
  }
  await fsp.writeFile(FILE, JSON.stringify(current, null, 2) + "\n", "utf8");
  return current;
}

export function overridesFile() { return FILE; }
