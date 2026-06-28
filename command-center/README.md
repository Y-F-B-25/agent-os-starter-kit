# Command Center

A local-first dashboard and group chat for a fleet of Claude Code (and compatible) agents. It reads your agents' session activity and a file-based message bus off disk, derives live per-agent telemetry (context %, tokens, tools, inbox depth), and gives you one pane to watch the fleet and talk to it.

Nothing here phones home. No API keys, no external endpoints. The backend is a single Node service on `127.0.0.1`; the frontend is a static React app you run locally.

## What you get

- **Live agent telemetry.** Each agent's context-window usage, token/tool counts, and current session, parsed from Claude Code session logs.
- **Group chat over a file bus.** Post to the fleet from the UI; each post writes a broadcast file plus per-agent inbox files your agents read on their next turn.
- **Harness.** Optional attention/interrupt signalling with acks, so a message to `@agent` can rise above the noise.
- **Pins, routines, agent renames.** Small quality-of-life state, stored as local JSON.

## Architecture

```
your vault (files on disk)  ─┐
Claude Code session JSONLs  ─┼──>  daemon (Node, 127.0.0.1:8787)  ──>  frontend (React + Vite)
                             │         GET /api/snapshot
                             │         POST /api/post
                             └────────  ws /api/stream
```

- **Vault is the only canonical data source.** The daemon reads your workspace and session logs, and writes chat/inbox files back to the vault. No external database.
- **Backend** is pure Node stdlib (no `npm install` needed to run the daemon).
- **Frontend** is React + Vite + TypeScript + Zustand, served as a static build.

## Quick start

1. **Point the daemon at your workspace.** Copy `.env.example` to `.env` and set at least `AGOS_PROJECT_ROOT` (and `AGOS_JSONL_DIR` if your Claude Code logs live elsewhere).
2. **Define your agents.** Edit `daemon/config.mjs` -> `AGENT_ROSTER` and `AGENT_FINGERPRINTS`. The roster shipped here is a generic 4-agent example; replace it with your own ids, slugs, roles, and boot-prompt fingerprints.
3. **Run the daemon.**
   ```
   cd daemon
   env $(grep -v '^#' ../.env | xargs) node index.mjs
   # then: curl -s http://127.0.0.1:8787/api/snapshot | python3 -m json.tool | head
   ```
4. **Run the frontend.**
   ```
   cd frontend
   npm install
   npm run dev      # or: npm run build && npm run preview
   ```
   Override the daemon URL at build time with `VITE_DAEMON_HTTP` / `VITE_DAEMON_WS` if you are not on the default port.

For auto-start on macOS, see `daemon/home.agos.telemetry.plist.example` (fill in your absolute paths) and `daemon/README.md`.

## Defining your agents

Each agent needs an entry in `AGENT_ROSTER` (id, display name, role, a `--ag-N` color token, inbox `slug`, context-window size) and an entry in `AGENT_FINGERPRINTS` (a unique substring from line 1 of that agent's boot prompt, used to map a session log to the agent). The convention assumed here is that every boot prompt starts with `You are <Agent Name> v<N>, <role>.`

## Layout

```
command-center/
  daemon/      Node backend: file watcher, snapshot builder, chat, harness
  frontend/    React + Vite dashboard and chat UI
  .env.example Configuration template (copy to .env)
```

## Security notes

- No secrets in this package. The only credential-looking strings are detection regexes in `daemon/lib/harness.mjs`, used to redact accidental secrets from chat excerpts.
- The daemon binds to `127.0.0.1` only and ships with no auth. Keep it local, or put it behind your own auth before exposing it.
- `daemon/state/` is gitignored. It holds local runtime state and should never be committed.
