# Blended Setup

Use this path when Claude and Codex should work from one shared vault.

## Best Fit

- User wants Claude for planning and management.
- User wants Codex for implementation and verification.
- Work crosses writing, operations, and code.
- The user can tolerate a little more process for a lot more leverage.

## Ownership Model

| Lane | Owns |
|---|---|
| Claude lead | Chief of Staff, planning, coaching, synthesis, project memory |
| Claude Code | terminal-native execution and repo operations |
| Codex | implementation patches, browser checks, local validation |
| Human | approvals, secrets, publishing, sensitive material |

## Shared Rules

- One shared vault.
- One BRAIN_INDEX.
- One progress file.
- One owner per file at a time.
- Start from `vault/02 — Architecture/OWNERSHIP_TEMPLATE.md` and write the active ownership map before edits.
- All cross-agent directives go through VaultBus or a clearly logged handoff.
- Security review before public release.

## First Pass Checklist

- [ ] Lead coordinator selected.
- [ ] Active ownership map written from `vault/02 — Architecture/OWNERSHIP_TEMPLATE.md`.
- [ ] Codex ownership written.
- [ ] Claude ownership written.
- [ ] VaultBus inboxes created.
- [ ] Status files created.
- [ ] First directive routed.
- [ ] No file ownership conflict.
- [ ] Save-up loop tested.

## Common Failure Modes

- Both agents edit the same file.
- Chat becomes the source of truth instead of the vault.
- Security review happens after publishing pressure starts.
- User has to manually reconcile conflicting plans.

## Finish Line

The blended lane is ready when Claude can assign work, Codex can execute a scoped piece, and both agents can resume from vault records without relying on private conversation memory.
