# Agent OS Evals

Agent OS evals answer one question: did the setup actually make the user more capable?

## Eval Types

| Eval | When | Purpose |
|---|---|---|
| Onboarding eval | During setup | Finds friction and confirms progress |
| Handoff eval | After save-up test | Proves memory survives session changes |
| Vault eval | After lint | Proves docs are findable and linked |
| Security eval | Before sharing | Proves no private material is leaking |
| Recursive improvement eval | After any breakdown | Proves the system learns from mistakes |
| Experience eval | At graduation | Proves the system matched the user's goal |

## Onboarding Eval

Stored in:

```text
vault/04 — Operations/onboarding-progress.json
```

Capture:

- selected lane
- quests completed
- difficulty rating per quest
- friction category
- retry count
- magic moment
- graduation success test

## Handoff Eval

Pass criteria:

- Agent writes a handoff.
- Next boot prompt points to the handoff.
- New session reads the handoff.
- New session can name current task, completed work, blocker, and next action.

Fail criteria:

- New session relies on prior chat only.
- Handoff omits next action.
- Handoff contains private secrets.
- BRAIN_INDEX or registry points to the wrong version.

## Vault Eval

Pass criteria:

- No broken links.
- No ambiguous links.
- Problem orphans are explained or linked.
- Accepted quiet files are classified.
- BRAIN_INDEX points to active docs.

## Security Eval

Pass criteria:

- No credential values in public docs.
- No private Command Center internals.
- No private inbox or chat exports.
- No private project data.
- Watcher guidance includes approval boundaries.

## Recursive Improvement Eval

Pass criteria:

- A breakdown is written down in plain language.
- A lesson is named.
- A specific doc, prompt, script, or playbook is patched.
- The failing check is run again.
- The retest result is recorded.
- The new instruction would have prevented or shortened the same failure.

Fail criteria:

- The agent only apologizes.
- The issue stays in chat and never reaches the repo or vault.
- The patch is too vague to test.
- The same failure would still happen in the next dry run.

## Experience Eval

Ask:

1. Did this match the success test you gave at the start?
2. What felt harder than expected?
3. What clicked?
4. Would you know how to start the next agent?
5. What should the setup co-pilot do differently next time?

## Shareable Eval Export

The user can choose to create a scrubbed export. The export may include:

- lane
- profile
- quest status counts
- difficulty ratings
- friction categories
- anonymous success result

The export must not include:

- names
- client details
- free-text private goals
- raw handoffs
- inbox files
- chat logs
- credentials
- local absolute paths
