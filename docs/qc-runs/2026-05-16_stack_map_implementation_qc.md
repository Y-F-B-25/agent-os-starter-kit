# Stack Map Implementation QC Run

Date: 2026-05-16

Status: GREEN for current tested scope, with blended QC still recommended before public launch.

## Scope

This run checks whether the repo supports the implementation-package promise:

- diagnose the user's workflow
- recommend Cowork, Claude Code, Codex, or blended
- build the vault and operating structure
- install the core routines
- test save-up and handoff
- record friction
- patch the system so it improves after breakdowns

## Evidence

| Area | Result | Evidence |
|---|---|---|
| Fresh-user path | GREEN | Chat-first lane reviewer ran beginner Organizer dry run and found no blockers |
| Codex builder path | GREEN | Codex lane reviewer ran temp-copy Codex builder dry run |
| Security QC | GREEN | Claude-side and Codex-side security reviewers both posted GREEN after watcher patch |
| Vault Lint | GREEN | Public template lint passes with 0 broken, 0 ambiguous, 0 problem orphans |
| Recursive improvement | GREEN | Codex dry run found missing registration step, patched `START_HERE.md`, retested lint |
| Full blended path | GREEN | Temp-copy blended run created ownership map, Claude Lead, Codex Verifier, VaultBus directive, and passed Vault Lint |

## Friction Found

1. Generated prompts and handoffs were not guaranteed to be registered before lint.
2. Empty root `Codex/` folder confused the file tree.
3. Claude Code path could soften git assumptions for newer builders.

## Patches Made

1. `START_HERE.md` now requires generated prompts, status files, directives, and handoffs to be registered during the quality loop.
2. Empty root `Codex/` folder was removed.
3. `docs/CLAUDE_CODE_SETUP.md` now tells newer users to ask for a two-minute git primer.
4. `docs/IMPLEMENTATION_QC.md` now defines the full implementation-package QC.
5. `docs/DRY_RUN_PLAN.md`, `docs/REPO_QC.md`, `docs/EVALS.md`, and `docs/PLAYBOOKS.md` now include recursive improvement checks.
6. `vault/02 — Architecture/OWNERSHIP_TEMPLATE.md` now gives blended setups an ownership-map starting point.

## Retest

After patches:

- `git diff --check`: pass
- watcher and lint Python compile: pass
- public vault lint: pass
- dry-run progress JSON: pass

## Remaining QC Before Launch

1. Confirm the launch-video script only shows behaviors the repo actually supports.
2. Decide whether to present the repo as self-serve starter, advisory lead magnet, or both.

## Decision

The repo is now framed as a self-serve implementation package for high-agency users. Public launch still waits on final human QC and launch-script alignment.
