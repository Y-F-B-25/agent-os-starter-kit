# Command Center daemon

The backend. Pure Node stdlib, no `npm install`, no `node_modules`.

## What it does

- Tails your Claude Code session JSONLs (under `AGOS_JSONL_DIR`, default `~/.claude/projects`). Derives per-session token + tool counts. Maps each session to an agent by scanning early user messages for the boot-prompt fingerprints in `config.mjs`.
- Watches your vault: the sessions dir, the inbox root, and the index file (all configurable in `config.mjs` / `.env`).
- Serves `GET /api/snapshot`, `POST /api/post`, and `ws://.../api/stream` on `127.0.0.1:<AGOS_CC_PORT>` (default 8787).

## Configure

All paths and the roster live in `config.mjs`, every value overridable by an environment variable. Copy `../.env.example` to `../.env`, set `AGOS_PROJECT_ROOT` (and `AGOS_JSONL_DIR` if needed), and replace the example `AGENT_ROSTER` / `AGENT_FINGERPRINTS` with your own agents.

## Quick run (foreground)

```
cd command-center/daemon
env $(grep -v '^#' ../.env | xargs) node index.mjs
```

Then in another shell:

```
curl -s http://127.0.0.1:8787/api/snapshot | python3 -m json.tool | head -40
curl -s http://127.0.0.1:8787/api/health
```

Expected: your roster's agents, real `currentTokens`, `currentTools`, `inboxCount`. `_meta.sessionsScanned` matches the JSONL count in your project log dir.

## Post to the chat (what agents do)

```
curl -s -X POST http://127.0.0.1:8787/api/post \
  -H 'Content-Type: application/json' \
  -d '{"author":"agent-one","body":"hello fleet","threadId":"main"}'
```

`author` accepts an agent `id`, `slug`, or display name, or `me` / `owner` for the human.

## launchd install (auto-start at login, macOS)

Fill in the absolute paths in `home.agos.telemetry.plist.example`, then:

```
cp home.agos.telemetry.plist.example ~/Library/LaunchAgents/home.agos.telemetry.plist
launchctl unload ~/Library/LaunchAgents/home.agos.telemetry.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/home.agos.telemetry.plist
launchctl list | grep home.agos.telemetry
```

## State

`state/` holds local runtime data (per-agent SDK state, harness acks/alerts, pins, routines, name overrides). It is gitignored and machine-local. Do not commit it.
