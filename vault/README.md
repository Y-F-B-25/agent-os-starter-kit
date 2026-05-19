# Agent OS Vault

This vault is the local memory layer for Agent OS. Open this folder in Obsidian if you want a visual graph and linked notes.

## Folder Map

| Folder | Purpose |
|---|---|
| `00 — Home` | Main index. Agents read `BRAIN_INDEX.md` on boot. |
| `01 — Security` | Security policies and approved handling notes. |
| `02 — Architecture` | System design, ownership, and operating structure. |
| `03 — Projects` | Project notes and working context. |
| `04 — Operations` | Progress, lint, routines, and setup state. |
| `05 — Sessions` | Agent session registry and boot prompts. |
| `06 — Decisions` | Decisions that should survive across sessions. |
| `07 — Contacts` | People, teams, and relationship notes if needed. |
| `08 — Handoffs` | Handoff protocol and next-session templates. |
| `09 — VaultBus` | Agent status, inboxes, and coordination files. |

## Start Here

The setup co-pilot should create or update:

```text
04 — Operations/onboarding-progress.json
```

Use this example if a starter is needed:

```text
04 — Operations/onboarding-progress.example.json
```

The progress JSON is the source of truth. The local HTML dashboard and optional Notion hub are display layers.
