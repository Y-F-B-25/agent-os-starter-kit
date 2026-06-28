#!/usr/bin/env node
// home.agos.telemetry — Command Center backend daemon (Phase 1).
// Pure Node stdlib. Tails Claude Code session JSONLs + watches the vault.
// Exposes GET /api/snapshot (REST) and ws://.../api/stream (WebSocket).

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { PORT, SNAPSHOT_REFRESH_MS, DEBOUNCE_MS } from "./config.mjs";
import { log } from "./lib/log.mjs";
import { buildSnapshot } from "./lib/snapshot.mjs";
import { startWatcher } from "./lib/vault.mjs";
import { attachWS } from "./lib/ws.mjs";
import { handlePost, attachmentsDir, mimeByExt } from "./lib/post.mjs";
import { setOverride } from "./lib/overrides.mjs";
import { pinMessage, unpinMessage } from "./lib/pins.mjs";
import { start as harnessStart, stop as harnessStop, setEnabled as harnessSetEnabled, pendingSummary as harnessSummary } from "./lib/harness.mjs";

let cached = null;
let cachedAt = 0;
let inflight = null;

async function getSnapshot(force = false) {
  if (!force && cached && Date.now() - cachedAt < 1000) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const snap = await buildSnapshot();
      cached = snap;
      cachedAt = Date.now();
      return snap;
    } catch (e) {
      log.error("snapshot: build failed", e.message, e.stack);
      throw e;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    const MAX = 12 * 1024 * 1024; // 12 MB; one big screenshot + body, base64 inflates ~33%
    req.on("data", (c) => {
      total += c.length;
      if (total > MAX) { reject(Object.assign(new Error("body too large"), { statusCode: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch (e) { reject(Object.assign(new Error("invalid JSON"), { statusCode: 400 })); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Serve chat attachments. Path-encoded filename only; we never resolve outside ATTACHMENTS_DIR.
  if (req.method === "GET" && url.startsWith("/api/attachments/")) {
    const raw = decodeURIComponent(url.slice("/api/attachments/".length));
    const safe = path.basename(raw);
    const full = path.join(attachmentsDir(), safe);
    if (!full.startsWith(attachmentsDir())) { res.writeHead(400); res.end("bad path"); return; }
    fs.stat(full, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); res.end("not found"); return; }
      const ext = path.extname(safe);
      res.setHeader("Content-Type", mimeByExt(ext));
      res.setHeader("Content-Length", st.size);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.writeHead(200);
      fs.createReadStream(full).pipe(res);
    });
    return;
  }

  if (req.method === "POST" && url === "/api/agent-rename") {
    try {
      const payload = await readJsonBody(req);
      const id = String(payload?.id || "").trim();
      const name = String(payload?.name || "").trim();
      if (!id) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: "id required" })); return; }
      if (name && name.length > 60) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: "name too long (max 60)" })); return; }
      await setOverride(id, name);
      schedulePush();
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, id, name }));
    } catch (e) {
      const code = e.statusCode || 500;
      log.warn("rename: failed", e.message);
      res.writeHead(code);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && url === "/api/pin") {
    try {
      const payload = await readJsonBody(req);
      const op = String(payload?.op || "pin").toLowerCase();
      const channelId = String(payload?.channelId || "main");
      const messageId = String(payload?.messageId || "");
      const state = op === "unpin"
        ? await unpinMessage(channelId, messageId)
        : await pinMessage(channelId, messageId);
      schedulePush();
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, pinnedMessageIds: state }));
    } catch (e) {
      const code = e.statusCode || 500;
      log.warn("pin: failed", e.message);
      res.writeHead(code);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && url === "/api/post") {
    try {
      const payload = await readJsonBody(req);
      const record = await handlePost(payload);
      schedulePush();
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, message: record }));
    } catch (e) {
      const code = e.statusCode || 500;
      log.warn("post: failed", e.message);
      res.writeHead(code);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && url === "/api/snapshot") {
    try {
      const snap = await getSnapshot();
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify(snap));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Harness control + read endpoints (CC v5 / harness v1).
  if (req.method === "GET" && url === "/api/harness") {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, ...harnessSummary() }));
    return;
  }

  if (req.method === "POST" && url === "/api/harness/enabled") {
    try {
      const payload = await readJsonBody(req);
      const flag = !!payload?.enabled;
      await harnessSetEnabled(flag);
      schedulePush();
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, enabled: flag }));
    } catch (e) {
      const code = e.statusCode || 500;
      res.writeHead(code);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && url === "/api/health") {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200);
    res.end(JSON.stringify({
      ok: true, port: PORT, pid: process.pid,
      uptimeSec: Math.floor(process.uptime()),
      cachedAtAge: cached ? Date.now() - cachedAt : null,
      wsClients: ws.count(),
    }));
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

const ws = attachWS(server, "/api/stream", async (client) => {
  // On connect, push the current snapshot so clients hydrate immediately.
  try {
    const snap = await getSnapshot();
    ws.sendTo(client, { type: "snapshot", at: new Date().toISOString(), data: snap });
  } catch (e) {
    log.warn("ws: hydrate failed", e.message);
  }
});

// Push a fresh snapshot on every vault/jsonl change (debounced inside watcher).
let pushTimer = null;
function schedulePush() {
  if (pushTimer) return;
  pushTimer = setTimeout(async () => {
    pushTimer = null;
    try {
      const snap = await getSnapshot(true);
      if (ws.count() > 0) {
        ws.broadcast({ type: "snapshot", at: new Date().toISOString(), data: snap });
      }
    } catch (e) {
      log.warn("push: build failed", e.message);
    }
  }, DEBOUNCE_MS);
}

const stopWatcher = startWatcher((label) => {
  log.info("change:", label);
  schedulePush();
});

// Periodic refresh so token counts age out even without filesystem signals.
const refreshInterval = setInterval(() => schedulePush(), SNAPSHOT_REFRESH_MS);

server.listen(PORT, "127.0.0.1", () => {
  log.boot(`home.agos.telemetry pid=${process.pid} port=${PORT}`);
  log.info("REST:  http://127.0.0.1:" + PORT + "/api/snapshot");
  log.info("WS:    ws://127.0.0.1:"   + PORT + "/api/stream");
  // Boot harness with a snapshot accessor for dormant-agent detection.
  harnessStart({ getSnapshot }).catch((e) => log.warn("harness: start failed", e.message));
});

function shutdown(signal) {
  log.info("shutdown: signal", signal);
  clearInterval(refreshInterval);
  try { stopWatcher(); } catch {}
  try { harnessStop(); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("uncaughtException", (e) => { log.error("uncaughtException", e.message, e.stack); });
process.on("unhandledRejection", (e) => { log.error("unhandledRejection", String(e)); });
