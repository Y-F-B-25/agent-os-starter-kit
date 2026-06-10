# Vault Lint - Structural Health Check

Vault Lint keeps the starter vault navigable as files accumulate. The public kit ships an executable lint script:

```bash
python3 operations/lint/vault_lint.py --vault vault
```

Run it after setup, after major vault changes, before sharing a repo, and whenever an agent creates prompts, status files, directives, or handoffs.

## What The Script Checks

The starter script checks:

- broken wikilinks
- ambiguous wikilinks
- markdown links to `.md` files
- backticked `.md` path registrations
- problem orphans
- accepted quiet orphans

The script exits `0` only when there are no broken links, ambiguous links, or problem orphans. A missing vault path, non-directory vault path, or vault with zero markdown files is a failure.

## Report Location

By default, the script writes:

```text
vault/04 — Operations/lint-reports/latest_lint.md
```

That file is generated output and should stay out of git. Keep `EXAMPLE_LINT_REPORT.md` as the public example.

## Result Meanings

| Result | Meaning | Action |
|---|---|---|
| Broken link | A wikilink or markdown link points nowhere | Fix the link or create the missing file |
| Ambiguous link | A wikilink matches more than one file stem | Rename or use a clearer markdown path |
| Problem orphan | A durable file has no inbound reference | Register it in BRAIN_INDEX or link it from another durable file |
| Accepted quiet orphan | An ephemeral file is intentionally unlinked | No action unless it should be durable |

Quiet paths include VaultBus command files, status files, escalations, events, and generated lint reports.

## Security Rule

Credential values do not belong anywhere in the vault. If lint, review, or a human finds a credential-shaped value in prompts, handoffs, status files, command files, dashboards, reports, or docs, treat it as critical:

1. Remove the value.
2. Replace it with an environment variable or Keychain reference by name only.
3. Rotate the credential if it may have been exposed.
4. Record the fix without printing the value.

## Manual Deep-Dive Checks

The script is intentionally small. For release or sensitive work, add a manual pass:

- BRAIN_INDEX points to active durable docs.
- SESSION_REGISTRY matches current handoffs and boot prompts.
- VaultBus status files match actual agent state.
- Generated logs and reports are ignored or archived.
- No `.env` files, private screenshots, raw chat exports, or private inbox exports are present.
- Contradictions between setup docs are patched and retested.

## Linking Pass

A linking pass is optional. Use it when durable docs have weak connectivity. Add links in natural places, then rerun Vault Lint.

Do not link every generated command or event file. Keep ephemeral coordination files quiet unless they become durable decisions.
