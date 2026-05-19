# Blended Ownership Template

Use this when Claude, Claude Code, Codex, or another agent share one vault.

## Lead

Name the lead coordinator:

```text
[Lead Agent Name]
```

The lead owns planning, user conversation, synthesis, routing, and final decisions before user approval.

## Lane Responsibilities

| Lane | Owns | Does Not Own |
|---|---|---|
| Cowork or Claude lead | Planning, coordination, coaching, synthesis, project memory | Unapproved repo edits or command execution |
| Claude Code | Terminal-native repo work, scripts, git inspection, local checks | User approvals, secrets, another agent's active file |
| Codex | Scoped implementation patches, browser checks, local validation, verification notes | Claude-owned planning files unless assigned |
| Human | Approvals, sensitive data, publishing, paid services | Mechanical file chores the agents can do |

## File Ownership

Write one owner per file or folder before work starts.

| File or Folder | Owner | Notes |
|---|---|---|
| `vault/00 — Home/BRAIN_INDEX.md` | [owner] | Usually the lead coordinator |
| `vault/04 — Operations/onboarding-progress.json` | [owner] | Usually the lead coordinator |
| `docs/` | [owner by file] | Assign each active edit before work starts |
| `operations/` | [owner by file] | Usually implementation lane |
| `vault/09 — VaultBus/10 — Status/` | each agent owns its own status file | No cross-editing another agent status file |
| `vault/09 — VaultBus/20 — Commands/inbox/` | lead creates directives, target agent responds | Keep directives secret-free |

## Coordination Rules

- One owner per file at a time.
- Cross-agent tasks go through VaultBus or a logged handoff.
- If ownership is unclear, stop and assign it.
- Do not put credential values in directives, prompts, handoffs, status files, or eval notes.
- Re-run Vault Lint after creating new prompts, status files, directives, and handoffs.
