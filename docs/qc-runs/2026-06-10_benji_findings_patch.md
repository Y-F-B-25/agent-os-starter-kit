# Agent OS Starter Kit QC - Benji Findings Patch

Date: 2026-06-10
Reviewer: Kepler, Codex local reviewer
Status: GREEN locally, pending Benji re-verification

## Scope

This patch responds to Benji's independent starter-kit QC findings from 2026-06-10.

## Fixed

- Rewrote `ai-os-infographic.html` to match the public starter kit:
  - 9 quests, Q0 to Q8
  - 5 profiles
  - local HTML dashboard by default
  - optional Notion
  - Vault Lint and local retrieval
  - no core SQLite, Wispr, or third-agent graduation promise
- Aligned the vault setup tree in `docs/PLAYBOOKS.md` with the template vault.
- Rewrote `vault/04 — Operations/VAULT_LINT.md` around the shipped executable.
- Removed old watcher-token guidance from `.gitignore`, handoff docs, and lint example report.
- Clarified Q0 dashboard instructions so users open their copied dashboard, not the sample.
- Removed private-tool references from `SESSION_REGISTRY.md`.
- Made `vault_lint.py` fail clearly on missing, non-directory, or empty vault paths.
- Made `verify_clean_room_claims.py --repo <bad>` fail with a clear message instead of a traceback.
- Clarified retrieval eval expectations because `vault/08 — Handoffs/` is intentionally excluded.
- Added Cowork mounting and Python 3 prerequisite guidance.
- Added blank-folder setup guidance when starter-kit docs are not mounted.
- Aligned save-up docs to one six-step sequence.
- Cleaned public template prose dashes where they were not part of exact folder names.
- Added `.tmp_*` to `.gitignore`.

## Verification

Commands run:

```bash
python3 -m py_compile operations/lint/vault_lint.py operations/retrieval/simple_retrieval.py operations/qc/verify_clean_room_claims.py operations/watchers/cowork_watcher.py
python3 operations/qc/verify_clean_room_claims.py
python3 operations/lint/vault_lint.py --vault vault --report-dir /tmp/agos-starter-kit-lint-report-2
python3 operations/retrieval/simple_retrieval.py --vault . --index /tmp/agos-starter-kit-retrieval-after-patches.json --build --query "What is the save-up protocol?" --max-results 5
git diff --check
```

Additional checks:

- Markdown link scan: 0 problems.
- Clean temp-copy verifier: GREEN.
- HTML parse: `ai-os-infographic.html`, QA pages, tech map, and dashboard parsed.
- Watcher safety checks: approved argv command passes; freeform command, secret-shaped argv, `rm`, and curl pipe patterns are rejected.
- Lint regression: backticked registration passes.
- Lint regression: planted problem orphan fails.
- Lint regression: missing vault path fails with a clear message.
- Lint regression: empty vault path fails with a clear message.
- QC regression: bad repo path fails with a clear message.
- Retrieval regression: private session path and secret-shaped markdown are excluded.

## Notes For Benji

- Retrieval query `"What is the save-up protocol?"` returns `CONTEXT_CEILING.md` and `SAVE_UP.md` in the top results. This is expected because Context Ceiling contains the trigger rules and Save-Up contains the action sequence.
- Generated `vault/04 — Operations/lint-reports/latest_lint.md` is ignored and not tracked.
- Local `.tmp_masthead_new.txt` and `.tmp_roster_new.txt` are ignored by the new `.tmp_*` rule.
