# Handoff Protocol

---

## When Does a Handoff Happen?
A handoff occurs when an agent session hits its context limit and needs to pass work to the next version. This is the universal operating rhythm for every agent.

## The Two Deliverables

Every handoff produces exactly TWO files. Both are mandatory:

1. **Handoff document** - the agent's memory of what happened, what's left, and what matters
2. **Boot prompt for the next version** - a paste-ready file the human uses to start the next session

The handoff preserves context. The boot prompt is how the human continues. Neither is optional.

## Steps

### 1. Agent writes handoff doc
Location: `[Your Vault]/08 — Handoffs/{agent-slug}-v{N}-to-v{N+1}.md`
Contents: current state, what was done, what's left, key decisions, gotchas

### 2. Agent writes boot prompt for v{N+1}
Location: `[Your Vault]/05 — Sessions/{Agent Name}/BOOT_PROMPT_v{N+1}.md`
Template: see BOOT_PROMPT_TEMPLATE.md
Must be: self-contained, paste-ready, starts with the agent's identity line, points to the handoff doc
Never dumps full context. The new agent reads the handoff and BRAIN_INDEX on demand.

### 3. Agent updates central registry
Updates: `05 — Sessions/SESSION_REGISTRY.md` and VaultBus status file

### 4. Agent tells the human
"I've hit my context ceiling. Handoff is at [path]. **Your boot prompt for v{N+1} is at [path]. Paste it into a new session to continue.**"
The human opens a new session, pastes the boot prompt. That's all the human does.

### 5. New agent boots
Reads boot prompt → reads handoff → reads BRAIN_INDEX.md → queries relevant vault files → picks up work

## Why the Agent Writes Its Own Boot Prompt

In advanced setups, a chief-of-staff agent (admin) may write boot prompts for project agents. But the default rule is: **the agent writes its own.** This ensures:
- The handoff and boot prompt are always consistent (same agent wrote both)
- The system works without a chief-of-staff (single-agent setups)
- The human always gets a paste-ready file, regardless of how many agents are running

---

## What a Good Handoff Doc Contains
- **Current state:** What's deployed, what's committed, what's in progress
- **Completed work:** Summary of what this version accomplished
- **Remaining work:** Ordered list of what's next
- **Key decisions:** Anything the next version needs to know about why things are the way they are
- **Known issues:** Bugs, blockers, gotchas
- **Files touched:** Key files this version created or modified

## What Does NOT Belong in a Handoff Doc
- **Implementation details** (parsing workarounds, version quirks) - put these in the relevant ops reference doc
- **Auth tokens or secrets** - reference the approved environment variable or Keychain item by name only, never inline the actual value
- **Full file contents** - link to the file, don't paste it
- **Rationale the next agent won't act on** - if it is context for the human, put it in the Decision Log (`06 — Decisions/`)

The handoff should answer: *what state is the work in, and what does the next version do first?* Everything else lives in the vault.
