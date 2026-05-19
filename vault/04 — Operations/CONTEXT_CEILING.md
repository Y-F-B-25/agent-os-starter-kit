# Context Ceiling Protocol

---

## Why This Exists

When an agent's context window gets too long, it stops following protocols. It forgets VaultBus updates, skips the watcher, misses inbox checks, and starts making decisions that cost the human time. This protocol prevents that by establishing a hard ceiling that every agent must enforce on itself.

---

## The Rule

**Every agent must track its own tool call count from session start.** When you hit the ceiling, you stop productive work and begin your save-up sequence. No exceptions.

### Thresholds

| Threshold | Tool Calls | What Happens |
|-----------|-----------|--------------|
| **Green** | 0-60 | Normal work. Follow all protocols. |
| **Yellow** | 61-80 | Awareness zone. Tell the human: "I'm at ~X tool calls, approaching context ceiling. I can finish [current task] but should save up soon." |
| **Red / Hard Ceiling** | 81+ | Stop new work immediately. Begin save-up sequence (see below). |

### How to Count

You don't have a literal token counter, so use **tool calls as a proxy**. Every time you use a tool (Read, Write, Edit, Bash, watcher command, MCP call, etc.), that's +1. Keep a running mental count. If you lose count, assume you're in yellow and tell the human.

---

## Save-Up Sequence

When you hit the hard ceiling (or the human tells you to save up), do this in order:

1. **Finish or checkpoint your current task.** Don't leave code half-written or a file half-edited. If you can't finish in 3-5 more tool calls, checkpoint what you have and document what's left.

2. **Update your VaultBus status file.** Set status to `done`. List what you accomplished and what's still pending.

3. **Write your handoff document.** Location: `[Your Vault]/08 — Handoffs/{agent-slug}-v{N}-to-v{N+1}.md`. Include:
   - What you accomplished this session
   - What's not done (be specific — file paths, line numbers, error messages)
   - Any context that would be lost (decisions made, preferences expressed, blockers discovered)
   - Exact next steps for the next version

4. **Write a boot prompt for your next version.** Location: `[Your Vault]/05 — Sessions/{Agent Name}/BOOT_PROMPT_v{N+1}.md`. The boot prompt must be:
   - **Self-contained** — paste-ready, no wrapper text or commentary
   - **Points to the handoff** — the new version reads it on boot
   - **Starts with the agent's identity line** (e.g., "You are the Admin Agent v5...")
   - This is non-negotiable. The handoff preserves context; the boot prompt is how the human starts the next session. Both must exist.

5. **Update your session README.** Location: `[Your Vault]/05 — Sessions/{Agent Name}/README.md`. Add the version entry.

6. **Tell the human you're done.** Say: "I've hit my context ceiling. Handoff is at [path]. **Your boot prompt for v{N+1} is at [path] — paste it into a new session to continue.**"

---

## The Operating Rhythm (for humans)

This is how your system works, every time, no exceptions:

1. You paste a boot prompt into a new session → your agent starts working
2. Your agent hits its context ceiling → it saves up automatically
3. You get two files: a **handoff** (the agent's memory) and a **boot prompt** (your next paste)
4. You open a new session, paste the boot prompt → the new version reads the handoff and picks up where the last one left off
5. Repeat

This is the heartbeat of the system. Agents come and go, but the vault persists. Nothing gets lost because every agent writes down what it knows before it leaves, and the next version reads it on arrival.

---

## Boot Prompt Requirement

Every boot prompt must include this block:

```
## Context Ceiling
You must track your tool call count from session start. At 60 tool calls, notify the human you're approaching the ceiling. At 80 tool calls, stop new work and begin your save-up sequence (see 04 — Operations/CONTEXT_CEILING.md). This is non-negotiable — long contexts cause protocol drift and degrade your work quality.

Your save-up sequence MUST produce TWO files: a handoff document AND a boot prompt for your next version. The human pastes that boot prompt to continue. This is the universal operating rhythm — never deviate from it.
```

---

## Why Tool Calls and Not Messages

Token count isn't directly observable from inside a session. Tool calls are. They also correlate well with context growth because each tool call adds both the request and the response to context. 80 tool calls with typical Read/Write/Bash usage puts most sessions well into the degradation zone.

The numbers (60/80) are starting estimates. If agents are still drifting before 60, lower the thresholds. If they're fine past 80 in some session types, you can create per-agent overrides. But start strict and loosen later — not the other way around.
