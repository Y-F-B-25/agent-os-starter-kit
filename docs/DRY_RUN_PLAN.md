# Dry Run Plan

The dry run proves the repo experience matches the public promise.

## Track 0: Stack Map Promise

Goal: prove the repo delivers the same promise as the stack map.

Use [IMPLEMENTATION_QC.md](IMPLEMENTATION_QC.md).

1. Confirm the diagnostic maps the user to Cowork, Claude Code, Codex, or blended.
2. Confirm the setup creates the vault, BRAIN_INDEX, VaultBus, prompts, handoff, and progress file.
3. Confirm routines are explained: Vault Lint, security sweep, retrieval, save-up, weekly review.
4. Confirm a breakdown can become a lesson, patch, eval, record, and retest.
5. Confirm the user understands what they can self-install and where expert help may still be useful.

## Track 1: Fresh User

Goal: prove a user can start with only the repo and a co-pilot.

1. Create a temporary folder.
2. Clone or copy the repo.
3. Paste `START_HERE.md` into a fresh co-pilot session.
4. Answer as a beginner Organizer.
5. Verify lane recommendation.
6. Verify vault creation.
7. Verify progress file creation.
8. Verify Chief of Staff prompt.
9. Verify specialist prompt.
10. Verify save-up and resume test.
11. Verify vault lint and eval status.
12. Verify the run did not rely on private memory, private routes, or a real Command Center.

## Track 2: Builder

Goal: prove Claude Code or Codex path works for a repo-heavy user.

1. Open the repo in Claude Code or Codex.
2. Paste `START_HERE.md`.
3. Answer as a Builder or Deep Worker.
4. Select terminal-first or Codex-first lane.
5. Verify repo checks are run.
6. Verify file edits are scoped and inspectable.
7. Verify generated prompts are usable.
8. Verify handoff loop works.

## Track 3: Blended

Goal: prove Claude and Codex can share one vault without stepping on each other.

1. Pick Claude as lead coordinator.
2. Pick Codex as implementation verifier.
3. Create one shared vault.
4. Assign file ownership.
5. Send one VaultBus directive.
6. Verify status files update.
7. Verify no file ownership conflict.
8. Run security review.

## Track 4: Public Release

Goal: prove the repo is safe to share.

1. Run token sweep.
2. Search for private routes.
3. Search for private Command Center details.
4. Search for raw inboxes or chat logs.
5. Verify examples are generic.
6. Verify watcher docs include safety boundaries.
7. Record GREEN, YELLOW, or RED in release notes.

## Track 5: Recursive Improvement

Goal: prove the system gets better after it fails.

1. Capture one real friction point from Track 1, 2, or 3.
2. Write the breakdown in the dry-run record.
3. Patch the relevant doc, prompt, script, or playbook.
4. Re-run the specific failing check.
5. Record the lesson and retest result.
6. Confirm the same issue is covered by future setup instructions.

## Track 6: Clean-Room QA

Goal: prove the setup feels real for someone seeing the repo for the first time.

Use [clean-room-qa.html](clean-room-qa.html) as the visual test map.

1. Use a fresh temp repo copy.
2. Use a blank vault.
3. Do not use prior agent memory.
4. Do not use private Command Center infrastructure.
5. Run one Cowork-style pass, one Claude Code-style pass, and one Codex-style pass.
6. Confirm the co-pilot explains dashboard options: progress JSON, optional Notion, or optional local HTML.
7. Confirm the local HTML dashboard template can be copied and populated.
8. Confirm the retrieval starter can build an index and answer one known question.
9. Confirm the co-pilot exposes gaps instead of silently filling them from inside knowledge.
10. Run the evidence gate in [CLAUDE_LANE_EVIDENCE_GATE.md](CLAUDE_LANE_EVIDENCE_GATE.md).
11. Patch docs, prompts, scripts, or evals when a gap appears.

## Pass Criteria

- START_HERE can drive setup without hidden private context.
- The four lanes are understandable.
- Progress file matches schema.
- Dashboard expectations are clear.
- Handoff loop works.
- At least one lesson loop works.
- Security review is GREEN before public release.
- Launch video scenes match real repo behavior.
