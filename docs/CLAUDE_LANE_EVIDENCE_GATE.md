# Claude Lane Evidence Gate

This gate keeps Cowork and Claude Code reviews from becoming narrative-only approvals.

## Rule

A lane result is not final GREEN unless it includes evidence.

Allowed evidence:

- verifier output from `operations/qc/verify_clean_room_claims.py`
- exact command output copied from a clean temp repo
- file paths for generated artifacts
- screenshot or transcript snippets that show the user-facing Cowork flow
- a written blocker with exact file and line references

Not enough:

- "Looks good"
- "I checked it"
- "Should work"
- "I walked the flow"
- any GREEN that does not say what was actually verified

## Required Fresh-User Evidence

For Cowork:

- fresh temp repo copy
- no private Command Center context
- diagnostic questions shown or summarized
- lane recommendation and why
- local HTML dashboard created or opened
- vault folder map explained
- save-up loop explained
- any command-based checks clearly marked as run locally or not runnable from Cowork

For Claude Code:

- fresh temp repo copy
- `python3 operations/qc/verify_clean_room_claims.py --repo .` output
- vault lint output
- retrieval starter output
- dashboard safety check
- exact YELLOW or RED items with file paths

For both:

- no hidden private context
- no private routes, inboxes, screenshots, or Command Center internals
- no unverified claim presented as done

## Decision Labels

Use these labels:

- GREEN: evidence is complete, no blocker
- PROVISIONAL GREEN: flow looks good, but some evidence is missing
- YELLOW: usable for dry run, release blocker remains
- RED: do not continue until patched

## Reviewer Prompt

Use this when asking for a review:

```text
Please run the Agent OS clean-room lane review with evidence.

Use a fresh temp repo copy and no prior memory. For Claude Code, run:

python3 operations/qc/verify_clean_room_claims.py --repo .

For Cowork, show the diagnostic, lane recommendation, dashboard, vault setup, save-up explanation, and any command checks you could or could not run.

Return one of: GREEN, PROVISIONAL GREEN, YELLOW, RED.

Do not mark GREEN unless you include evidence.
```
