# Save-Up Protocol

Save-up is how an agent preserves work before context gets unreliable or before another session takes over.

## When To Save Up

- The user asks for it.
- The current task is complete.
- Context is getting long.
- Another agent or session needs to continue.
- The agent is blocked and needs a clean handoff.

## The Six Required Actions

1. **Checkpoint the current task**
   - Finish the current edit if possible, or clearly document what remains.

2. **Write a handoff**
   - Path: `vault/08 — Handoffs/[agent-slug]-vN-to-vN+1.md`
   - Include completed work, current state, blockers, decisions, and next action.

3. **Write the next boot prompt**
   - Path: `vault/05 — Sessions/[Agent Name]/BOOT_PROMPT_vN+1.md`
   - Keep it self-contained and point it to the handoff.

4. **Update the session README**
   - Path: `vault/05 — Sessions/[Agent Name]/README.md`
   - Append the current version, date, result, and next boot prompt path.

5. **Update BRAIN_INDEX**
   - Path: `vault/00 — Home/BRAIN_INDEX.md`
   - Register any new durable files the next agent must know about.

6. **Update status and tell the human where to continue**
   - Path: `vault/09 — VaultBus/10 — Status/[agent-slug].md`
   - Set status to `done`, `waiting`, or `blocked`.
   - Give the handoff path and boot prompt path.

## Handoff Template

```markdown
# [Agent] vN to vN+1 Handoff

## Completed
- ...

## Current State
- ...

## Decisions
- ...

## Blockers
- ...

## Next Action
1. ...

## Files Changed
- ...

## Verification
- ...
```

## Boot Prompt Requirements

The next boot prompt must include:

- role and version
- mounted folder convention
- BRAIN_INDEX path
- handoff path
- current priority
- status/inbox paths
- context ceiling reminder

## Pass Criteria

Save-up passes when a fresh session can read the next boot prompt, open the handoff, and correctly state:

- what was done
- what remains
- what file to edit or inspect first
- whether anything is blocked
