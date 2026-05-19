# Agent OS Repo QC

Use this checklist before presenting the repo as ready.

## Content QC

- [ ] README explains the four setup lanes.
- [ ] START_HERE supports Cowork, Claude Code, Codex, and blended setup.
- [ ] Legacy web-app-centered onboarding has been removed.
- [ ] Diagnostic is current.
- [ ] Setup paths are current.
- [ ] Playbooks are present.
- [ ] Eval docs are present.
- [ ] Save-up protocol is present.
- [ ] Vault lint executable is present.
- [ ] Codex boot prompt example is present.
- [ ] Cowork prerequisites are present.
- [ ] Security review doc is present.
- [ ] Implementation QC doc is present.
- [ ] Vault template links are valid.
- [ ] Examples are generic and safe.

## Functional QC

- [ ] A new user can paste START_HERE into a co-pilot and get a lane recommendation.
- [ ] Co-pilot can create `onboarding-progress.json`.
- [ ] Co-pilot can create or verify vault folders.
- [ ] Co-pilot can write a Chief of Staff prompt.
- [ ] Co-pilot can write a specialist prompt.
- [ ] Save-up and resume loop works.
- [ ] Vault lint passes or explains what remains.
- [ ] At least one breakdown creates a lesson, patch, eval, record, and retest.

## Blended QC

- [ ] Ownership boundaries are written.
- [ ] Claude and Codex do not edit the same file at the same time.
- [ ] Shared vault paths are explicit.
- [ ] Each agent has a status file and inbox.
- [ ] Human approval points are clear.

## Security QC

- [ ] Token sweep passes.
- [ ] Git history scan passes, or the public release will use a clean or squashed history.
- [ ] No private Command Center internals.
- [ ] No private inbox or chat exports.
- [ ] No credential values.
- [ ] No private routes.
- [ ] No sensitive screenshots.
- [ ] Watcher guidance includes safety boundaries.

## Dry Run

Run at least two dry runs:

1. **Fresh user dry run:** no existing vault, start from START_HERE.
2. **Builder dry run:** repo-heavy user, Claude Code or Codex lane.

Optional:

3. **Blended dry run:** Claude lead plus Codex implementation lane.
4. **Enterprise dry run:** team rollout with security review early.
5. **Implementation QC:** confirm the stack map promise in [IMPLEMENTATION_QC.md](IMPLEMENTATION_QC.md).

## Evidence Gate

Claude-side lane reviews must pass [CLAUDE_LANE_EVIDENCE_GATE.md](CLAUDE_LANE_EVIDENCE_GATE.md). A narrative-only GREEN is not accepted.

For Claude Code and local checks, run:

```bash
python3 operations/qc/verify_clean_room_claims.py --repo .
```

For Cowork, the reviewer must include visible evidence from the chat-first flow and mark any command-based checks as either run locally or not runnable from Cowork.

## Launch Gate

The repo is ready for launch only when:

- content QC passes
- functional QC passes
- lane GREENs are evidence-backed, not narrative-only
- security QC is GREEN
- git history is approved for public release or replaced with a clean release history
- at least one dry run has completed the save-up loop
- at least one recursive improvement loop has passed
- launch video script matches the real repo experience
