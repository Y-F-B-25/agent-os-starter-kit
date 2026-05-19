# BRAIN_INDEX.md — Agent Boot Index
**Last updated:** [DATE]
**Maintained by:** [Your Admin Name] (Admin Agent v1)

---

## How to Use This File
You are an agent. Read this file on boot. It tells you where everything is. Do NOT memorize this — query the vault on demand.

---

## Master Folder
All agent work lives at: `~/Desktop/[Your Folder]/`

---

## Projects

| Project | Work Folder | Vault Notes | Git Repo | Status |
|---------|------------|-------------|----------|--------|
| Example Project | `[Your Folder]/Projects/Example/` | `03 — Projects/Example/` | — | Active |
<!-- Add your projects here. One row per project. -->

---

## Agent Sessions

See full registry: `05 — Sessions/SESSION_REGISTRY.md`

| Agent | Current Version | Session Folder | Status |
|-------|----------------|----------------|--------|
| Admin ([Your Admin Name]) | v1 | `05 — Sessions/Admin/` | Active — initial setup |
<!-- Add agents as you create them. -->

---

## Key Vault Locations

| What | Path |
|------|------|
| This index | `00 — Home/BRAIN_INDEX.md` |
| Vault guide | [README](../README.md) |
| Security policies | `01 — Security/` |
| Architecture docs | `02 — Architecture/` |
| Project notes | `03 — Projects/[Project Name]/` |
| Operations docs | `04 — Operations/` |
| Session histories | `05 — Sessions/[Agent Name]/` |
| Decision log | `06 — Decisions/` |
| Contacts | `07 — Contacts/` |
| Handoff protocol | `08 — Handoffs/` |
| VaultBus (inter-agent coord) | `09 — VaultBus/` |

---

## Key Operations Files

| What | Path |
|------|------|
| Handoff protocol | [HANDOFF_PROTOCOL](../08 — Handoffs/HANDOFF_PROTOCOL.md) |
| Save-up protocol | `[Your Folder]/docs/SAVE_UP.md` |
| Boot prompt template | [BOOT_PROMPT_TEMPLATE](../08 — Handoffs/BOOT_PROMPT_TEMPLATE.md) |
| Session registry | [SESSION_REGISTRY](../05 — Sessions/SESSION_REGISTRY.md) |
| VaultBus protocol | [VAULTBUS_PROTOCOL](../09 — VaultBus/00 — Protocol/VAULTBUS_PROTOCOL.md) |
| Context Ceiling protocol | [CONTEXT_CEILING](../04 — Operations/CONTEXT_CEILING.md) |
| Vault Lint | [VAULT_LINT](../04 — Operations/VAULT_LINT.md) |
| Onboarding progress example | `../04 — Operations/onboarding-progress.example.json` |
| Blended ownership template | [OWNERSHIP_TEMPLATE](../02 — Architecture/OWNERSHIP_TEMPLATE.md) |
| Diagnostic | `[Your Folder]/docs/DIAGNOSTIC.md` |
| Setup paths | `[Your Folder]/docs/SETUP_PATHS.md` |
| Playbooks | `[Your Folder]/docs/PLAYBOOKS.md` |
| Evals | `[Your Folder]/docs/EVALS.md` |
| Security review | `[Your Folder]/docs/SECURITY_REVIEW.md` |
| Watcher ops reference | `[Your Folder]/operations/watchers/WATCHER_OPS.md` |
| Watcher script | `[Your Folder]/operations/watchers/cowork_watcher.py` |
<!-- Register every new file here as you create it. -->

---

## Local Execution
Use the setup lane selected in `vault/04 — Operations/onboarding-progress.json`.

| Lane | Default execution |
|------|-------------------|
| Cowork | Chat-first setup, optional watcher for local commands |
| Claude Code | Terminal-native repo and vault work |
| Codex | OpenAI local implementation and validation |
| Blended | Shared vault with explicit file ownership |

If the watcher is used, it runs in approval-required mode. Never write credential values into vault files, prompts, handoffs, or command files.

---

## Rules for Agents
1. Read this file on boot. Do not ask the human for context you can find here.
2. Query specific vault files on demand — never load everything at once.
3. **Save-up produces TWO files.** When you hit the context ceiling, you write a handoff document AND a boot prompt for your next version. The human pastes the boot prompt to continue. Both are mandatory — see `04 — Operations/CONTEXT_CEILING.md`.
4. Desktop is source of truth. Cloud storage is backup only.
5. The human does zero mechanical work. If you need something done, do it or ask the admin agent.
6. **Create + Register is atomic.** Any time you create a new file that other agents may need, you MUST register it in this index (BRAIN_INDEX.md) in the same action. If it's not in BRAIN_INDEX, it doesn't exist to the next agent. No exceptions.
7. **Check your inbox (VaultBus).** Before starting work and after each milestone, read your VaultBus inbox at `09 — VaultBus/20 — Commands/inbox/{your-agent-slug}/`. Update your status file at `09 — VaultBus/10 — Status/{your-agent-slug}.md`.
8. **Verify with the right lane.** Cowork may need a watcher for local commands. Claude Code and Codex can usually run local checks directly. Never report work as done without the relevant verification.
9. **Emit state via VaultBus.** Update your status file at every task transition (start, milestone, blocked, done). If blocked, create an escalation. Append events.
10. **Enforce the Context Ceiling.** Use the context signal your lane exposes. If there is a token or context meter, treat 70 percent as save-up territory. If there is no meter, use tool calls as a rough proxy and save up before quality drops. Full protocol: `04 — Operations/CONTEXT_CEILING.md`.
11. **Handle git deliberately.** Check status before edits. Do not push, pull, publish, or rewrite history without user approval.
12. **Use Edit for existing files, not Write.** When modifying existing code or docs, use targeted Edit operations. Full file rewrites from memory lose code and introduce invisible bugs.
13. **Boot prompts must start clean.** No wrapper text, no commentary. The prompt IS the first message the agent sees. Deliver prompts inline, ready to paste verbatim.
