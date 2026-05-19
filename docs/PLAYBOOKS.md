# Agent OS Playbooks

These playbooks are the public operating routines the setup co-pilot can teach or install. For the packaged view, see [SKILLS_PACK.md](SKILLS_PACK.md).

## Stack Selection

Use [DIAGNOSTIC.md](DIAGNOSTIC.md) and [SETUP_PATHS.md](SETUP_PATHS.md).

Minimum output:

- selected lane
- why it fits
- first agent team
- success test
- safety constraints

## Vault Setup

Create:

```text
vault/
  00 — Home/
  01 — Systems/
  02 — Architecture/
  03 — Projects/
  04 — Operations/
  05 — Sessions/
  08 — Handoffs/
  09 — VaultBus/
```

Then create or verify:

- `vault/00 — Home/BRAIN_INDEX.md`
- `vault/05 — Sessions/SESSION_REGISTRY.md`
- `vault/08 — Handoffs/HANDOFF_PROTOCOL.md`
- `vault/09 — VaultBus/00 — Protocol/VAULTBUS_PROTOCOL.md`

## Obsidian

Use Obsidian as the visual vault browser.

Rules:

- If the user has an existing vault, create a new Agent OS vault beside it.
- Do not merge into an existing vault without explicit approval.
- Keep graph clutter low by separating generated logs from thinking docs.
- Use links for durable knowledge, not every event file.

## Notion Coordination

Notion is optional. Use it when the user wants a dashboard.

Create:

- profile card
- quest tracker
- progress summary
- agent status view
- getting unstuck note

The vault remains canonical. Notion is a display and coordination layer.

## Local HTML Dashboard

Use [LOCAL_DASHBOARD.md](LOCAL_DASHBOARD.md) when the user wants visual quest tracking without Notion.

Starter template:

```text
examples/dashboards/setup-progress-dashboard.html
```

The progress JSON remains canonical. The HTML dashboard is a visual mirror.

## Vector Retrieval

Retrieval is optional but useful after the vault grows.

Starter routine: [VECTOR_RETRIEVAL.md](VECTOR_RETRIEVAL.md).

Local starter:

```bash
python3 operations/retrieval/simple_retrieval.py --vault . --index .agent-os-retrieval/root-index.json --build
python3 operations/retrieval/simple_retrieval.py --vault . --index .agent-os-retrieval/root-index.json --query "What is the handoff protocol?"
```

Rules:

1. Index only public or user-approved vault folders.
2. Exclude credentials, private chat, raw inboxes, and generated logs.
3. Test retrieval with known questions.
4. Record what is indexed.
5. Re-index after major vault changes.

## Security Sweep

Run before publishing and after sensitive setup changes.

Minimum checks:

1. Search for credential-shaped values in the working tree.
2. Search git history for old secrets if the repo was ever public.
3. Search for private routes, raw inboxes, raw chat exports, and sensitive screenshots.
4. Verify watcher guidance is approval-required and does not store secrets in command files.
5. Record GREEN, YELLOW, or RED without printing secret values.

## Vault Lint

Run lint after setup and after major changes.

Checks:

- broken wikilinks
- ambiguous wikilinks
- true orphan docs
- accepted quiet files
- generated logs excluded from problem counts

Output should tell the user what to fix first.

## Evals

Use evals to improve the setup, not to judge the user.

Capture:

- quest status
- time estimate vs actual
- difficulty rating
- friction notes
- magic moments
- graduation success test

See [EVALS.md](EVALS.md).

## Lesson Loop

Every serious breakdown should improve the system.

Use this loop:

1. Name the breakdown.
2. Name the lesson.
3. Patch a doc, prompt, script, or playbook.
4. Re-run the failed check.
5. Record the result.
6. Register the new or changed file in BRAIN_INDEX if it belongs in the vault.

## Security Agents

Use a security agent when:

- secrets may exist in files
- a repo will be published
- a watcher can run commands
- a blended setup shares a vault
- private client data may be in context

The security agent reviews scope, not credential values.

## Token Sweep

Before public release:

1. Search for common token patterns.
2. Search chat, inbox, vault, examples, and docs.
3. Check git history if the repo was ever pushed.
4. Replace secrets with env var names.
5. Document findings without printing token values.

## Save-Up

Use save-up when context is long, work is complete, or another session must continue.

Full protocol: [SAVE_UP.md](SAVE_UP.md).

Required outputs:

- handoff doc
- next boot prompt
- updated status
- updated BRAIN_INDEX or session registry if ownership changed
- clear next step

## Routines

Daily or active-use routine:

1. Read BRAIN_INDEX.
2. Check active projects.
3. Check VaultBus inbox and status.
4. Pick one concrete next action.
5. Save up before context gets risky.

Weekly or release routine:

1. Run vault lint.
2. Run token sweep.
3. Run repo QC.
4. Review stale handoffs.
5. Archive generated logs that do not need to stay visible.
