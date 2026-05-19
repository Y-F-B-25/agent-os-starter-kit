# Clean-Room QA Run

Date: 2026-05-18

Status: GREEN for clean-room product QC. Public launch still waits on final repo naming, release packaging, final security suite, website, and video.

## Scope

This run tested the repo from a fresh temp copy with no git history, no private Command Center, and no prior agent memory. The Codex-local pass used only repo files as the allowed source of truth.

## Personas

| Persona | Lane | Result |
|---|---|---|
| Chat-first Organizer | Cowork | PASS, chat-first lane final GREEN with evidence |
| Repo Builder | Claude Code | PASS, Claude Code verifier output attached |
| OpenAI Implementer | Codex | PASS |
| Blended Operator | Blended | PASS by doc, dashboard, ownership, and evidence-gated lane coverage |

## Evidence

| Check | Result |
|---|---|
| Fresh temp copy created | PASS |
| Blank user vault folder created outside repo | PASS |
| `START_HERE.md` covers lane diagnostic | PASS |
| Clean-room QA HTML exists and parses | PASS |
| Local dashboard template exists and parses | PASS |
| Dashboard embedded quest data parses | PASS, 9 quests |
| Vault Lint on template vault | PASS, 11 files, 0 broken, 0 ambiguous, 0 problem orphans |
| Python compile | PASS for watcher, lint, and retrieval starter |
| Retrieval starter build | PASS, indexed 34 markdown files after private-folder exclusions |
| Retrieval query: handoff protocol | PASS, returned public eval and save-up docs after private handoff folder exclusion |
| Retrieval query: Vault Lint | PASS, top result was Vault Lint |
| Token pattern scan | REVIEWED, only regex pattern definitions in watcher safety code appeared |
| Retrieval index private paths | PASS, no `05 — Sessions`, `08 — Handoffs`, `09 — VaultBus`, `Logs`, security, or lint-report paths |
| Retrieval index absolute vault path | PASS, no saved `vault` key |
| Dashboard render | PASS, quest rows use DOM nodes and `textContent`, not `innerHTML` |
| Cowork lane POV | PASS, final GREEN with evidence attached |
| Claude Code lane POV | PASS, verifier exit 0, SUMMARY GREEN, 30 checks PASS |
| Codex-side security re-check | PASS, GREEN, no Codex-side security blocker remains |
| Claude-side security re-check | PASS, GREEN, working tree and full git history credential scan clean |

## Gaps Found

### Gap 1: local dashboard was documented but not real enough

Problem: The repo said a local HTML dashboard was an option, but there was no starter file for the setup co-pilot to copy and populate.

Patch:

- Added `docs/LOCAL_DASHBOARD.md`
- Added `examples/dashboards/setup-progress-dashboard.html`
- Updated README, START_HERE, PLAYBOOKS, DRY_RUN_PLAN, and NOTION_DASHBOARD_SCHEMA

Retest:

- HTML parser accepted the dashboard template.
- Embedded progress JSON parsed.
- Dashboard has 9 quests, profile, lane, next action, blocker, handoff, Vault Lint, and security status.

### Gap 2: retrieval was a concept, not an installable routine

Problem: The repo described vector retrieval, but a first-time user did not have a concrete local starter.

Patch:

- Added `docs/VECTOR_RETRIEVAL.md`
- Added `operations/retrieval/simple_retrieval.py`
- Updated README, START_HERE, PLAYBOOKS, and DRY_RUN_PLAN
- Added `.agent-os-retrieval/` to `.gitignore`

Retest:

- Script compiled.
- Script built a local no-dependency retrieval index.
- Query for handoff protocol returned public eval and save-up docs after private handoff folder exclusion.
- Query for Vault Lint returned Vault Lint as the top result.

### Gap 3: retrieval and dashboard security hardening

Problem: Security review found that the retrieval starter could index private operational markdown folders by default, wrote an absolute vault path into the generated index, and the dashboard rendered quest rows with `innerHTML`.

Patch:

- Retrieval now excludes `05 — Sessions`, `08 — Handoffs`, the whole `09 — VaultBus`, `Logs`, security notes, lint reports, backups, and snapshots by default.
- Retrieval skips markdown files with secret-shaped values.
- Retrieval filters sensitive or high-entropy tokens out of term dictionaries.
- Retrieval no longer writes the absolute vault path into the index.
- Dashboard quest rendering now uses DOM creation and `textContent`.

Retest:

- Python compile passed.
- Dashboard HTML parsed.
- Dashboard embedded JSON parsed.
- `innerHTML` is no longer present in the dashboard template.
- Retrieval index contains no blocked private paths.
- Retrieval index contains no saved absolute vault key.

### Gap 4: first-user polish

Problem: Claude-side fresh-user POV was GREEN, but found four polish items: no progress example JSON, no vault root README, stale mention of an empty `Codex/` root folder, and dashboard discovery was too easy to miss.

Patch:

- Added `vault/04 — Operations/onboarding-progress.example.json`.
- Added `vault/README.md`.
- Added an explicit post-Q0 instruction to open the local HTML dashboard.
- Confirmed there is no `Codex/` folder in the current repo tree.
- Registered the new vault files in `BRAIN_INDEX.md`.

Retest:

- Progress example JSON parses.
- Vault Lint passes with 11 files, 0 broken, 0 ambiguous, 0 problem orphans.
- No `Codex/` root folder exists in the current tree.
- Dashboard and infographic HTML still parse.

### Gap 5: narrative-only lane approvals are too weak

Problem: A Claude-side lane can sound GREEN without enough evidence. That is risky for release QC.

Patch:

- Added `docs/CLAUDE_LANE_EVIDENCE_GATE.md`.
- Added `operations/qc/verify_clean_room_claims.py`.
- Updated repo QC and dry-run plan to reject narrative-only GREENs.
- Required Cowork and Claude Code GREENs to include evidence before final status.

Retest:

- Codex verifier baseline is GREEN:
  - required files present
  - progress example has Q0 to Q8
  - dashboard parses and has no `innerHTML`
  - Python compile passes
  - Vault Lint passes with 0 problem orphans
  - retrieval returns Vault Lint, omits absolute vault key, and omits private folders
  - git diff check passes
- Chat-first lane reviewer attached evidence and reported final GREEN, no provisional.
- Claude-side verifier returned exit 0, SUMMARY GREEN, 30 checks all PASS.
- Codex-side security reviewer reported GREEN.
- Claude-side security reviewer reported GREEN.

## Lane Notes

### Cowork

Repo instructions are present for Cowork setup, prerequisites, dashboard choices, and watcher boundaries.

The chat-first lane reviewer attached fresh-user evidence and marked the Cowork lane final GREEN.

### Claude Code

Repo instructions are present for terminal setup, git explanation, lint, retrieval, and generated artifacts.

The Claude Code reviewer attached verifier output and marked the Claude Code lane final GREEN.

### Codex

Local Codex-style checks passed after the dashboard and retrieval patches.

### Blended

Ownership template and blended docs are present. The clean-room pass confirms the instructions exist, the local dashboard tracks progress, and all lane owners returned GREEN for this QC scope.

## Current Decision

Clean-room QA is GREEN for the Agent OS product scope. Remaining pre-public work is release packaging, final naming, a final security sweep on the exact release state, and the separate website/video go-to-market track.
