// Raw RFC 6455 WebSocket server. Server-to-client text frames only.
// Inbound frames are accepted (handshake + ping/close) but no payload routing yet.
//
// Why no `ws` dep: keeps this codebase 0-deps (matches Operations/dashboard/build_dashboard.py
// posture). Server-side WS without dep needs ~80 LOC; this file pays that cost once.

import crypto from "node:crypto";
import { log } from "./log.mjs";

const MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function acceptKey(key) {
  return crypto.createHash("sha1").update(key + MAGIC).digest("base64");
}

export function attachWS(server, route, onConnect) {
  const clients = new Set();

  server.on("upgrade", (req, socket, head) => {
    if (req.url !== route) {
      socket.destroy();
      return;
    }
    const key = req.headers["sec-websocket-key"];
    if (!key) { socket.destroy(); return; }
    const accept = acceptKey(key);
    const headers = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
    ].join("\r\n") + "\r\n\r\n";
    socket.write(headers);

    const client = { socket, alive: true };
    clients.add(client);
    log.info("ws: client connected, total =", clients.size);

    socket.on("data", (buf) => handleFrame(client, buf, clients));
    socket.on("close", () => { clients.delete(client); log.info("ws: client closed, total =", clients.size); });
    socket.on("error", (e) => { log.warn("ws: socket error", e.message); clients.delete(client); });

    if (onConnect) {
      try { onConnect(client); } catch (e) { log.warn("ws: onConnect threw", e.message); }
    }
  });

  return {
    broadcast(payload) {
      const text = typeof payload === "string" ? payload : JSON.stringify(payload);
      const frame = encodeTextFrame(text);
      for (const c of clients) {
        if (!c.alive) continue;
        try { c.socket.write(frame); } catch (e) {
          log.warn("ws: write failed, dropping client", e.message);
          c.alive = false;
          clients.delete(c);
        }
      }
    },
    sendTo(client, payload) {
      const text = typeof payload === "string" ? payload : JSON.stringify(payload);
      try { client.socket.write(encodeTextFrame(text)); } catch (e) {
        log.warn("ws: sendTo write failed", e.message);
      }
    },
    count() { return clients.size; },
  };
}

// Encode a single text frame, no fragmentation, FIN=1, opcode=1, no mask (server-to-client).
function encodeTextFrame(text) {
  const payload = Buffer.from(text, "utf8");
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;        // FIN + text
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function handleFrame(client, buf, clients) {
  // Minimal inbound handler: accept ping (0x9) -> respond pong (0xA); accept close (0x8) -> close.
  // Ignore text/binary content (we don't yet expect client→server messages).
  if (buf.length < 2) return;
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let payloadLen = buf[1] & 0x7f;
  let cursor = 2;
  if (payloadLen === 126) { payloadLen = buf.readUInt16BE(cursor); cursor += 2; }
  else if (payloadLen === 127) { payloadLen = Number(buf.readBigUInt64BE(cursor)); cursor += 8; }
  let mask = null;
  if (masked) { mask = buf.slice(cursor, cursor + 4); cursor += 4; }
  const payload = buf.slice(cursor, cursor + payloadLen);
  if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];

  if (opcode === 0x8) {
    try { client.socket.end(); } catch {}
    clients.delete(client);
    return;
  }
  if (opcode === 0x9) {
    // pong frame
    const pong = Buffer.concat([Buffer.from([0x8a, payload.length]), payload]);
    try { client.socket.write(pong); } catch {}
    return;
  }
  // text/binary: ignore content for v1
}
