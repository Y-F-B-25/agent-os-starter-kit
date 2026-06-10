# Agent OS Starter Kit QC - Kepler Pass

Date: 2026-06-10
Reviewer: Kepler, Codex local reviewer
Status: GREEN after one documentation patch
Public commit reviewed: `d1d87af`

## Scope

This pass reviewed the setup package for first-time users choosing:

- Cowork
- Claude Code
- Codex
- Blended Claude plus Codex

It also checked:

- Vault Lint
- local retrieval
- progress schema
- eval docs
- security guidance
- optional Cowork watcher safety
- public release hygiene

## Prior Bug Context

The previous user-reported issue exposed two real problems:

- Vault Lint did not count backticked `.md` paths as inbound references.
- Problem orphans were reported but did not fail lint.

Those were fixed in commit `12bcc4e`. This QC re-tested both behaviors.

## Commands Run

```bash
python3 operations/qc/verify_clean_room_claims.py
python3 -m py_compile operations/lint/vault_lint.py operations/retrieval/simple_retrieval.py operations/qc/verify_clean_room_claims.py
python3 -m py_compile operations/watchers/cowork_watcher.py
python3 operations/lint/vault_lint.py --vault vault --report-dir /tmp/agos-starter-kit-lint-report
python3 operations/retrieval/simple_retrieval.py --vault . --index /tmp/agos-starter-kit-retrieval-index.json --build --query "How do I run Vault Lint?" --max-results 5
```

## Results

| Area | Result | Evidence |
|---|---|---|
| Clean-room verifier | PASS | Required files present, dashboard safe render, lint pass, retrieval pass |
| Vault Lint | PASS | 11 files, 0 broken, 0 ambiguous, 0 problem orphans |
| Retrieval | PASS | Indexed 36 markdown files and returned relevant docs |
| Markdown links | PASS | 0 repo-level markdown link problems |
| Python syntax | PASS | Lint, retrieval, QC, and watcher scripts compile |
| Cowork watcher safety | PASS | Allows approved argv commands, rejects freeform command strings, secret-shaped argv, `rm`, and curl pipe patterns |
| Public remote | PASS | `origin/main` points to `d1d87af` |

## Regression Tests

Backticked path registration:

- Good case: `BRAIN_INDEX.md` registered `../03 — Projects/Registered.md` in backticks.
- Result: lint exited `0` with 0 problem orphans.

Problem orphan failure:

- Bad case: added an unregistered markdown file.
- Result: lint exited `1` with 1 problem orphan.

Retrieval safety:

- Created public, private session, and secret-shaped markdown examples.
- Result: retrieval indexed only the public markdown file.
- Private session path was not indexed.
- Secret-shaped file was not indexed.
- Index did not store an absolute vault path.

## Lane Review

Cowork:

- Prerequisites explain folder mounting and research-preview uncertainty.
- Setup docs avoid treating Cowork as mandatory.
- Local commands are routed through an optional approval-required watcher only when needed.

Claude Code:

- Setup docs require workspace inspection before edits.
- `git status` is required only when the folder is a git repo.
- The docs tell the co-pilot to explain git output plainly when needed.

Codex:

- Setup docs frame Codex as implementation and verification.
- The docs avoid assuming Claude-specific tools exist.
- Blended ownership is required before shared-file edits.

Blended:

- Ownership model exists.
- One owner per file is explicit.
- VaultBus or logged handoff is required for cross-agent directives.

## Patch Made In This Pass

One small documentation mismatch was fixed:

- `docs/VECTOR_RETRIEVAL.md` used `root-index.json` in the command but later referred to `index.json`.
- The sentence now matches the example path: `.agent-os-retrieval/root-index.json`.

Patch commit:

```text
d1d87af Align retrieval index documentation
```

## Remaining Notes

- No functional blockers found.
- Two unrelated local untracked files were present before this pass and were not touched: `.tmp_masthead_new.txt`, `.tmp_roster_new.txt`.
- The repo is ready for users to retry the starter kit from public `main`.
