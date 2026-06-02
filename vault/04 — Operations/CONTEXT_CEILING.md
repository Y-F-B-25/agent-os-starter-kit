# Context Ceiling Protocol

---

## Why This Exists

Long agent sessions eventually lose instruction fidelity. Agents start missing inbox checks, skipping handoffs, repeating work, or making decisions from stale context. This protocol keeps the system reliable by forcing a save-up before quality drops.

---

## The Rule

Use the best context signal your lane exposes.

| Signal available | Yellow zone | Red zone |
|---|---:|---:|
| Token or context meter | 50-69 percent | 70 percent or higher |
| No meter available | about 60 tool calls | about 80 tool calls |

At red, stop new work and begin the save-up sequence. No exceptions.

### How to Read the Signal

- If the app shows a token or context percentage, trust that over tool-call count.
- If the app shows a context-limit warning, treat that as red even if you do not know the exact percentage.
- If the session compacted, do not assume you are fresh. Continue only if the current task is clear and the handoff risk is low. Otherwise, save up.
- If no meter exists, use tool calls as a rough fallback. Tool calls are imperfect, but they are still a useful warning sign because tool results add a lot of context.

---

## Save-Up Sequence

When you hit red, or the human tells you to save up, do this in order:

1. **Finish or checkpoint the current task.** Do not leave code half-written or a file half-edited. If you cannot finish in a few more actions, checkpoint what exists and document what remains.

2. **Update your VaultBus status file if your setup uses one.** Set status to `done`, `blocked`, or the clearest current state. List what changed and what still needs attention.

3. **Write the handoff document.** Location: `[Your Vault]/08 — Handoffs/{agent-slug}-v{N}-to-v{N+1}.md`. Include:
   - What you accomplished
   - What is not done
   - Decisions, preferences, or blockers the next session needs
   - Exact next steps

4. **Write the next boot prompt.** Location: `[Your Vault]/05 — Sessions/{Agent Name}/BOOT_PROMPT_v{N+1}.md`. The boot prompt must be:
   - Self-contained
   - Paste-ready
   - Pointed at the handoff
   - Started with the agent identity line

5. **Update your session README.** Add the new version entry and link to the handoff and boot prompt.

6. **Tell the human where to continue.** Give the handoff path and the next boot prompt path.

---

## The Operating Rhythm

1. The human starts an agent session with a boot prompt.
2. The agent works until the context signal reaches red.
3. The agent writes a handoff and the next boot prompt.
4. The next session reads the handoff and picks up the work.

The vault is the durable memory. The handoff is what prevents context from being lost between sessions.

---

## Boot Prompt Requirement

Every boot prompt should include this block:

```
## Context Ceiling
Use the clearest context signal your lane exposes. If you can see token or context percentage, warn the human around 50 percent and save up at 70 percent or on any context-limit warning. If you cannot see a meter, use tool calls as a rough fallback: warn around 60 tool calls and save up around 80, or sooner if quality drops. See 04 — Operations/CONTEXT_CEILING.md.

Your save-up sequence must produce a handoff document and a boot prompt for your next version.
```

---

## Why Tool Calls Are Only a Fallback

Tool calls are not the real ceiling. The real ceiling is remaining usable context, and that depends on the model, app, compaction state, file sizes, and the kind of work being done.

Use tool-call counts only when the agent cannot see a better meter. Start strict, then adjust based on observed quality in the specific lane.
