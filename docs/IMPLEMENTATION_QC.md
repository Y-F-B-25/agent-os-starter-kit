# Agent OS Implementation QC

This QC proves the repo can act like a lightweight implementation package for a high-agency user.

It does not replace a human implementation partner. It proves the repo can guide someone through the same first-pass structure a forward deployed engineer would normally help them install: workflow diagnosis, stack choice, vault setup, routines, evals, and a loop that turns breakdowns into better docs and better agent behavior.

## The Promise To Test

A user should be able to start from `START_HERE.md` and end with:

- a recommended setup lane: Cowork, Claude Code, Codex, or blended
- a vault with durable memory
- a Chief of Staff prompt
- at least one specialist prompt
- VaultBus status and inbox structure
- a save-up and resume loop
- Vault Lint
- security sweep guidance
- optional vector retrieval routine
- eval records that capture friction and lessons
- a clear next project to run through the system

## Stack Map Coverage

The diagnostic and setup flow must cover the same concepts as the stack map.

| Stack Map Area | Repo Proof |
|---|---|
| Diagnostic paths | `START_HERE.md`, `docs/DIAGNOSTIC.md`, `docs/SETUP_PATHS.md` |
| Build map | vault template, `BRAIN_INDEX.md`, VaultBus, boot prompts |
| Playbooks | `docs/PLAYBOOKS.md` |
| Routines | Vault Lint, save-up, security sweep, retrieval, weekly review |
| Evaluation | `docs/EVALS.md`, progress JSON, friction notes |
| Safety | `docs/SECURITY_REVIEW.md`, watcher boundaries, token sweep |
| Recursion | lesson loop that patches docs, prompts, playbooks, or evals after breakdowns |

## Test Personas

Run the QC with at least these personas.

| Persona | Expected Lane | Success Test |
|---|---|---|
| Chat-first Organizer | Cowork | Can create a vault, Chief of Staff, specialist, and handoff without terminal fluency |
| Repo Builder | Claude Code | Can run setup, inspect diffs, run lint, and understand git output |
| OpenAI Implementer | Codex | Can make scoped repo edits, validate them, and write a handoff |
| Blended Operator | Blended | Can assign Claude and Codex ownership without file conflicts |
| Advisory Buyer | Any lane | Understands what they can self-install and where they may want expert help |

## Lane QC

### Cowork

Pass:

- `docs/COWORK_PREREQS.md` explains what Cowork is and how folder access works.
- The user can run the diagnostic conversationally.
- The user understands that new agents may need new Cowork sessions.
- Local commands are routed through an approval-required watcher only when needed.
- Setup remains useful without terminal fluency.

Watch:

- Cowork should not be described as required.
- The watcher should never become the default for Claude Code or Codex.

### Claude Code

Pass:

- The user knows this path is terminal-native.
- The co-pilot checks repo state before edits.
- The co-pilot explains `git status`, `diff`, `commit`, and `branch` in plain language when needed.
- Generated files are inspectable.
- Lint and schema checks run locally.

Watch:

- Do not bury the user in terminal output.
- Do not assume the user already understands git.

### Codex

Pass:

- The user understands Codex as the implementation and verification lane.
- Codex can create or patch docs, prompts, scripts, and local UI checks.
- Browser or app validation is used when relevant.
- Handoff notes are written before stopping.
- Blended ownership is explicit if Claude is also involved.

Watch:

- Do not assume Claude-specific tools exist.
- Do not edit files assigned to another lane.

### Blended

Pass:

- One lead coordinator is named.
- Claude, Claude Code, and Codex ownership is written before file edits.
- A shared vault exists.
- Each agent has a status file and inbox.
- One cross-agent directive is created and acknowledged.
- No two agents edit the same file at once.

Watch:

- Blended mode is powerful but should not be the default for every beginner.

## Routine QC

The repo should teach the user which routines exist, when to run them, and what they protect.

| Routine | Minimum Test |
|---|---|
| Vault Lint | Run `python3 operations/lint/vault_lint.py --vault vault`; explain broken links, ambiguous links, problem orphans, and accepted quiet files |
| Security Sweep | Run token and private-data checks before sharing or publishing |
| Vector Retrieval | Explain what gets indexed, what is excluded, and how retrieval quality is tested |
| Save-Up | Produce a handoff and next boot prompt, then prove a new session can resume |
| Weekly Review | Review stale handoffs, lint report, active projects, and friction notes |
| Watcher | If used, verify approval-required mode and no secrets in command files |

## Recursive Improvement QC

The setup passes only if it can improve itself after a breakdown.

Every breakdown should become:

1. **Breakdown:** what failed or confused the user.
2. **Lesson:** what the system should learn.
3. **Patch:** which doc, prompt, script, or playbook changed.
4. **Eval:** how we prove the mistake is less likely next time.
5. **Record:** where the lesson is stored.
6. **Retest:** which dry-run scenario now passes.

Example:

- Breakdown: generated handoffs were not linked, so Vault Lint reported problem orphans.
- Lesson: setup co-pilots must register prompts, status files, directives, and handoffs.
- Patch: `START_HERE.md` quality loop now requires registration every quest.
- Eval: rerun Vault Lint and confirm 0 problem orphans.
- Record: progress JSON friction note and dry-run report.
- Retest: Codex builder dry run passes.

## Evidence To Capture

For each dry run, write a short record with:

- persona
- lane recommended
- lane accepted or corrected
- artifacts created
- routines installed or deferred
- lint result
- security result
- handoff result
- friction points
- patches made
- retest result

Recommended location:

```text
docs/qc-runs/YYYY-MM-DD_{persona}_{lane}.md
```

## Launch Gate

The repo is not ready to present as a complete implementation package until:

- Cowork, Claude Code, Codex, and blended QC each have a passing dry-run record
- at least one recursive improvement loop has been proven
- Vault Lint passes on the public template
- security QC is GREEN
- the stack map claims match real repo behavior
- the launch video script shows only behaviors the repo can actually support
