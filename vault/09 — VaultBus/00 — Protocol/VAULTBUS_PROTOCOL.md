# VaultBus - Inter-Agent Coordination Protocol

**Last updated:** [DATE]

---

## What Is VaultBus?

VaultBus is a filesystem-based coordination system for agents running in isolated sessions. Every agent mounts the same shared folder, and that filesystem is the communication channel between sessions.

VaultBus has four layers:

| Layer | Purpose | Style |
|-------|---------|-------|
| **Status** | What is true right now about an agent | Current-state doc, overwritten in place |
| **Commands** | What another actor wants an agent to do | Message objects, append/create oriented |
| **Escalations** | What is blocked and needs attention | Alert objects, append/create oriented |
| **Events** | Lightweight change feed for audit and triggers | Append-only NDJSON |

Plus a **Views** layer for human-readable dashboards derived from the above.

---

## Folder Layout

All paths relative to `[Your Vault]/09 — VaultBus/`:

```
00 — Protocol/          System rules, schemas, this file
10 — Status/            One current status file per agent
20 — Commands/
    inbox/{agent}/      Per-agent incoming directives
    archive/            Completed/acknowledged commands
30 — Escalations/
    open/               Active escalations needing attention
    closed/             Resolved escalations
40 — Events/            Append-only event log (events.ndjson)
50 — Views/             Derived dashboards (not source of truth)
```

---

## Agent Boot Sequence

Every agent does this on startup:

1. Read `BRAIN_INDEX.md`
2. Read this file (`09 — VaultBus/00 — Protocol/VAULTBUS_PROTOCOL.md`)
3. Read your inbox: `09 — VaultBus/20 — Commands/inbox/{your-agent-slug}/`
4. Read your status file if it exists: `09 — VaultBus/10 — Status/{your-agent-slug}.md`
5. Begin work

---

## Status Files

**Location:** `10 — Status/{agent-slug}.md`
**Rule:** Exactly one file per agent. Agent overwrites its own file in place. No agent edits another agent's status file.

### Format: YAML Frontmatter + Markdown Body

```yaml
---
agent: project-agent
session_name: Project Agent
status: working
current_task: Building homepage layout
blocker: null
needs_attention: false
escalation_id: null
last_updated: 2026-01-01T10:00:00-07:00
last_event_id: evt_001
assigned_by: admin
priority: high
---
## Notes
Working on the homepage layout. Header and nav completed.

## Next Step
Finish the hero section, then push via watcher.
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `agent` | string | Agent slug (lowercase, hyphenated) |
| `session_name` | string | Human-readable name |
| `status` | enum | `idle`, `working`, `blocked`, `waiting`, `done` |
| `current_task` | string | What the agent is doing right now |
| `blocker` | string or null | What's preventing progress |
| `needs_attention` | bool | Does the admin or human need to look at this? |
| `escalation_id` | string or null | Reference to open escalation if blocked |
| `last_updated` | ISO 8601 | When this file was last written |
| `last_event_id` | string | ID of most recent event this agent emitted |
| `assigned_by` | string | Who assigned current work |
| `priority` | enum | `low`, `medium`, `high`, `critical` |

### When to Update

- At task start
- At each milestone (or every 15-20 tool calls if no context meter exists)
- When blocked
- When done
- When entering the yellow context zone

---

## Command Files

**Location:** `20 — Commands/inbox/{target-agent}/{timestamp}_{command_id}.md`
**Rule:** Commands are immutable after creation (except `status` field for ack tracking).

### Format

```yaml
---
command_id: cmd_001
to: project-agent
from: admin
type: directive
priority: high
status: open
created_at: 2026-01-01T10:00:00-07:00
related_task: homepage-build
response_required: true
---
## Directive
Build the homepage hero section with the approved copy.

## Success Criteria
- Hero section renders correctly
- Verified through watcher
- Status file updated
```

### Command Types

| Type | Use |
|------|-----|
| `directive` | Do this task |
| `question` | Answer this question |
| `handoff` | Take over this work |
| `approval_request` | I need permission to proceed |
| `sync_request` | Read my status and acknowledge |

### After Processing

Move completed command files to `20 — Commands/archive/`. Update the `status` field to `acknowledged` or `completed` before archiving.

---

## Escalation Files

**Location:** `30 — Escalations/open/{timestamp}_{escalation_id}.md`
**Rule:** Created when an agent is genuinely blocked and needs intervention. Not for ordinary waiting.

### Format

```yaml
---
escalation_id: esc_001
from: project-agent
owner: admin
severity: high
kind: permission_blocker
status: open
created_at: 2026-01-01T10:00:00-07:00
last_updated: 2026-01-01T10:00:00-07:00
related_command_id: cmd_001
---
## Problem
Cannot push to GitHub — watcher not responding.

## Impact
Deploy stalled.

## Requested Resolution
Admin to verify watcher is running.

## Recommended Next Step
Check watcher status, restart if needed.
```

### Severity Levels

| Severity | Meaning |
|----------|---------|
| `low` | Annoying but not blocking |
| `medium` | Slowing progress |
| `high` | Work is stopped |
| `critical` | Time-sensitive, needs immediate attention |

### Escalation Kinds

`permission_blocker`, `dependency_blocker`, `ambiguity`, `tool_failure`, `handoff_needed`

---

## Event Log

**Location:** `40 — Events/events.ndjson`
**Format:** Newline-delimited JSON (one JSON object per line)
**Rule:** Append-only. Never edit existing lines.

### Event Types

```jsonl
{"event_id":"evt_001","ts":"2026-01-01T10:00:00","agent":"project-agent","type":"status_update","status":"working","file":"10 — Status/project-agent.md"}
{"event_id":"evt_002","ts":"2026-01-01T10:05:00","agent":"admin","type":"command_created","target":"project-agent","command_id":"cmd_001","file":"20 — Commands/inbox/project-agent/cmd_001.md"}
```

### When to Append

Every time you: update your status, create a command, acknowledge a command, create an escalation, or close an escalation.

---

## Write Permissions

| Actor | Can Write |
|-------|-----------|
| Any agent | Own status file, own replies, new commands (as sender), new escalations, event log entries |
| Admin agent | All of the above plus: commands to any agent inbox, view regeneration |
| Watcher | View files only (`50 — Views/`) |
| No one | Another agent's status file |

---

## Honest Limitations

- **No session wake-up:** VaultBus cannot forcibly interrupt a Cowork session. Commands sit in inboxes until the target agent is activated.
- **Pull-on-activation:** The best pattern is durable inboxes. The admin drops a command, and the agent picks it up next time it boots.
- **Near-instant, not instant:** Filesystem changes propagate immediately to the watcher, but a mid-conversation agent won't see them until it checks.
- **The human still switches sessions:** VaultBus reduces what the human needs to relay to near-zero content, but they still bring agents online.

---

## Rules Summary

1. Read this protocol doc on boot.
2. Own your status file. Update it at every transition.
3. Check your inbox before starting work and after milestones.
4. Never edit another agent's status file.
5. Use escalations for real blockers, not routine waiting.
6. Append events for every write operation.
7. Views are summaries. Read primary files when acting.
8. Commands are immutable after creation.
9. Create + Register is atomic (inherited from BRAIN_INDEX Rule 6).
10. **Enforce the Context Ceiling.** Use the best context signal available. If a token or context meter exists, yellow starts around 50 percent and red starts at 70 percent. If no meter exists, use tool calls as a rough fallback. Full protocol: `04 — Operations/CONTEXT_CEILING.md`.
