# Agent OS Starter Kit Skills Pack

The Skills Pack is the set of operating routines the setup co-pilot teaches, installs, or configures while building a user's Agent OS.

It is not a private app bundle and it does not require the user's tools to match the maintainer's setup. It is a practical starter pack for turning AI use into a repeatable operating system with memory, quality checks, and safety gates.

## What The User Gets

| Skill | What it does | Where it lives |
|---|---|---|
| Setup diagnostic | Routes the user to Cowork, Claude Code, Codex, or blended setup | `docs/DIAGNOSTIC.md` |
| Stack selection | Explains which lane fits and what to add later | `docs/SETUP_PATHS.md` |
| Vault setup | Creates the shared memory structure, BRAIN_INDEX, sessions, handoffs, and VaultBus | `vault/` |
| Local progress dashboard | Gives the user a visual quest map for setup progress | `docs/LOCAL_DASHBOARD.md`, `examples/dashboards/` |
| Optional Notion dashboard | Adds a Notion-style coordination hub when the user wants one | `docs/NOTION_DASHBOARD_SCHEMA.md` |
| Save-up and handoff | Lets agents stop safely and continue work in the next session | `docs/SAVE_UP.md`, `vault/08 — Handoffs/` |
| Vault Lint | Checks broken links, ambiguous links, and problem orphans | `operations/lint/vault_lint.py` |
| Local retrieval | Indexes approved markdown so agents can find context without bulk-reading | `docs/VECTOR_RETRIEVAL.md`, `operations/retrieval/` |
| Security sweep | Checks for credential leaks, risky scripts, private data, and release blockers | `docs/SECURITY_REVIEW.md` |
| Token sweep | Searches working tree and history for credential-shaped values | `docs/PLAYBOOKS.md` |
| Agent evals | Records friction, lessons, and quality signals from setup | `docs/EVALS.md` |
| Recursive improvement loop | Turns breakdowns into patches, evals, records, and retests | `docs/IMPLEMENTATION_QC.md` |
| Blended ownership | Defines what Claude and Codex own when they share one vault | `docs/BLENDED_SETUP.md`, `vault/02 — Architecture/OWNERSHIP_TEMPLATE.md` |
| Optional watcher bridge | Gives chat-first setups an approval-required path for local checks | `operations/watchers/` |

## What It Does Not Ship

The public Skills Pack does not ship the maintainer's private Command Center, group chat, private inboxes, raw logs, private routes, production telemetry, or personal agent memory.

Advanced local setups may add app-specific skills such as browser automation, Notion operations, document generation, scheduled tasks, custom communication rules, or media workflows. Those are useful upgrades, but they are not required for Agent OS Starter Kit and are not included in this public repo.

## How To Market It

Short version:

> A guided skills pack for building your first agent operating system: shared memory, dashboards, handoffs, retrieval, lint, evals, and security checks.

Website version:

> Agent OS Starter Kit gives your setup co-pilot a practical skills pack. It helps you build a shared vault, local progress dashboard, handoff loop, retrieval routine, Vault Lint, evals, and security checks so your agents can keep learning instead of starting over.

Consulting version:

> Use the repo yourself, or work with Yacob to adapt the same skills pack to your team, tools, and workflows.

## Setup Co-Pilot Rule

During setup, the co-pilot should explain the Skills Pack after the diagnostic and before Q1. The user should know what is included by default, what is optional, and what requires approval.
