# Agent OS Starter Kit

Build your first agent operating system step by step, with guided implementation for shared memory, dashboards, handoffs, evals, and safety checks.

Agent OS Starter Kit gives a user one shared vault, one setup co-pilot, and a set of playbooks for running AI teammates across Cowork, Claude Code, Codex, or a blended stack.

This repo is not a private Command Center export. It is the public starter kit: templates, diagnostics, setup paths, vault structure, skills pack, evaluation docs, and safety checks that help someone build their own local agent operating system.

## Start Here

New users should open [START_HERE.md](START_HERE.md), copy the whole file, and paste it as the first message to their chosen setup co-pilot.

Supported setup lanes:

| Lane | Best for | Start with |
|---|---|---|
| Cowork | Users who want a chat-first Claude setup with mounted files | Claude desktop or Cowork |
| Claude Code | Users who want terminal-native project work | Claude Code in this repo |
| Codex | Users who want an OpenAI local coding agent | Codex desktop or CLI |
| Blended | Users who want Claude and Codex working in the same vault | One lead co-pilot, then add the second lane |

The co-pilot runs a diagnostic, recommends the lane, builds the vault, writes the first agent prompts, sets up progress tracking, and leaves a QC trail.

## What Is Inside

```text
START_HERE.md                      Setup co-pilot boot prompt
GETTING_STARTED.md                 Human guide to the four setup lanes
ai-os-infographic.html             Technical overview

docs/
  DIAGNOSTIC.md                    Better diagnostic and path logic
  SETUP_PATHS.md                   Cowork, Claude Code, Codex, blended setup
  COWORK_PREREQS.md                Cowork prerequisites and folder mounting
  COWORK_SETUP.md                  Cowork lane quickstart
  CLAUDE_CODE_SETUP.md             Claude Code lane quickstart
  CODEX_SETUP.md                   Codex lane quickstart
  BLENDED_SETUP.md                 Blended lane quickstart
  PLAYBOOKS.md                     Operating playbooks
  SKILLS_PACK.md                   Skills included in the starter kit
  EVALS.md                         Onboarding and repo quality evals
  LOCAL_DASHBOARD.md               Optional local HTML dashboard guidance
  VECTOR_RETRIEVAL.md              Local retrieval starter and upgrade path
  SAVE_UP.md                       Public handoff and continuation protocol
  SECURITY_REVIEW.md               Public release safety checks
  CLAUDE_LANE_EVIDENCE_GATE.md     Evidence rules for Claude-side lane reviews
  REPO_QC.md                       Dry run and launch checklist
  IMPLEMENTATION_QC.md             Full implementation-package QC
  clean-room-qa.html               Visual QA map for first-time setup testing
  tech-map.html                    Builder-facing stack map

vault/                             Obsidian vault template
  00 — Home/BRAIN_INDEX.md         Master index
  04 — Operations/                 Context ceiling and vault lint
  05 — Sessions/                   Session registry template
  08 — Handoffs/                   Handoff protocol and boot template
  09 — VaultBus/                   Filesystem coordination protocol

operations/
  qc/verify_clean_room_claims.py    Reproducible clean-room evidence checker
  watchers/                        Optional local watcher bridge
  lint/vault_lint.py               Starter vault lint executable
  retrieval/simple_retrieval.py     No-dependency local retrieval starter

examples/
  boot-prompts/                    Example admin and project agents
  dashboards/                      Local setup dashboard template
  handoff-example.md               Example save-up handoff
  pitch-page/index.html            Simple public pitch page template
```

## Core Ideas

**The co-pilot does the setup work.** The user answers questions, approves decisions, and learns the operating rhythm. The co-pilot creates files, writes prompts, updates the vault, and validates the result.

**The vault is the durable memory.** Every agent reads the same BRAIN_INDEX, writes handoffs, and uses the same folder conventions. Sessions can end without losing the work.

**The stack is configurable.** Some users should start in Cowork. Some should start in Claude Code or Codex. Some should run a blended team with clear ownership between Claude and OpenAI agents.

**The skills pack is practical.** The repo gives the setup co-pilot routines for vault setup, dashboards, handoffs, retrieval, Vault Lint, evals, security sweeps, and blended ownership.

**Coordination stays explicit.** VaultBus uses files, status docs, command inboxes, and events. It is boring on purpose, which makes it inspectable.

**Quality has to be measured.** Setup is not complete until the user can run a save-up cycle, lint the vault, inspect eval data, and explain which agent owns which work.

**The system should learn.** Breakdowns should become lessons, patches, evals, records, and retests so the next run gets better instead of repeating the same mistake.

**The HTML dashboard is the default visual layer.** The progress JSON is the source of truth. The local HTML dashboard makes quests easier to scan, and Notion is the optional coordination hub for users who want a command-center-style workspace.

**Retrieval starts local.** The starter retrieval script indexes approved vault markdown files without external APIs. Users can upgrade later when the vault is large enough to need semantic search.

## The Four Layers

| Layer | What it does | Typical tools |
|---|---|---|
| Human | Sets direction, approves, decides when to stop | User plus voice dictation |
| Coordination | Routes tasks and tracks agent state | Chief of Staff agent, VaultBus, Notion |
| Memory | Holds durable context and handoffs | Obsidian vault, BRAIN_INDEX, handoffs |
| Execution | Does project work and local checks | Cowork, Claude Code, Codex, watcher |

## Setup Path

Read [GETTING_STARTED.md](GETTING_STARTED.md) for the human flow, or paste [START_HERE.md](START_HERE.md) directly into your setup co-pilot.

The setup co-pilot will:

1. Diagnose your goals, tools, and preferred lane.
2. Create or verify the vault structure.
3. Build a progress file and local HTML dashboard, with optional Notion coordination.
4. Write your Chief of Staff prompt.
5. Write your first specialist prompt.
6. Run a save-up and handoff test.
7. Run vault lint and onboarding eval checks.
8. Explain the Skills Pack and leave you with next-agent instructions.

For QA, use [docs/clean-room-qa.html](docs/clean-room-qa.html) to test the repo from a fresh temp folder, blank vault, and no private context.

## Public Release Gate

Before sharing a release build, run the checks in [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) and [docs/REPO_QC.md](docs/REPO_QC.md). The public repo must not contain private Command Center internals, private inboxes, real credentials, personal routes, or private project data.

## License

MIT
