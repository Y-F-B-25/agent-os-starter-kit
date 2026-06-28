// Pinned messages (CC v4 2026-04-30). Per-channel array of message IDs.
//
// Schema: { "<channelId>": ["<messageId>", ...] }
// Persisted to daemon/state/pins.json. Surfaced in snapshot.pinnedMessageIds.
// the owner asked for a way to pin chat messages he wants to keep visible.

import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "./log.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(__dirname, "..", "state");
const FILE = path.join(STATE_DIR, "pins.json");

export async function loadPins() {
  try {
    const raw = await fsp.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    return {};
  } catch (e) {
    if (e.code !== "ENOENT") log.warn("pins: load failed", e.message);
    return {};
  }
}

async function savePins(state) {
  await fsp.mkdir(STATE_DIR, { recursive: true });
  await fsp.writeFile(FILE, JSON.stringify(state, null, 2) + "\n", "utf8");
}

export async function pinMessage(channelId, messageId) {
  const ch = String(channelId || "main");
  const id = String(messageId || "");
  if (!id) {
    const err = new Error("messageId required");
    err.statusCode = 400;
    throw err;
  }
  const state = await loadPins();
  const list = Array.isArray(state[ch]) ? state[ch] : [];
  if (!list.includes(id)) list.push(id);
  state[ch] = list;
  await savePins(state);
  return state;
}

export async function unpinMessage(channelId, messageId) {
  const ch = String(channelId || "main");
  const id = String(messageId || "");
  const state = await loadPins();
  const list = Array.isArray(state[ch]) ? state[ch] : [];
  state[ch] = list.filter((x) => x !== id);
  await savePins(state);
  return state;
}

export function pinsFile() { return FILE; }
