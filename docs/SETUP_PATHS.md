# Agent OS Setup Paths

Agent OS has four supported setup paths. They converge on the same architecture: shared vault, BRAIN_INDEX, VaultBus, boot prompts, handoffs, evals, and safety checks.

## Path 1: Cowork

Best for users who want to manage agents through conversation.

Detailed lane doc: [COWORK_SETUP.md](COWORK_SETUP.md).

### Build Order

1. Mount the Agent OS folder in Cowork.
2. Paste `START_HERE.md`.
3. Run the diagnostic.
4. Create the vault folders.
5. Create `BRAIN_INDEX.md`.
6. Create VaultBus.
7. Optional: connect Notion for the dashboard.
8. Write Chief of Staff and specialist prompts.
9. Test save-up and reboot.

### Strengths

- Friendly first experience.
- Good for non-terminal users.
- Natural handoff between user and agents.

### Watchouts

- The user may need to open new sessions manually.
- Local commands may need a watcher or another local agent.

## Path 2: Claude Code

Best for users who want terminal-native setup, local file work, or repo work.

Detailed lane doc: [CLAUDE_CODE_SETUP.md](CLAUDE_CODE_SETUP.md).

### Build Order

1. Open Claude Code in the starter-kit folder, project folder, or setup folder.
2. Paste `START_HERE.md`.
3. Run the diagnostic.
4. Use shell checks for workspace and vault state.
5. Create or patch files.
6. Run lint and schema checks.
7. Write boot prompts.
8. Test the save-up loop in a fresh session.

### Strengths

- Strong file and command execution.
- Good for builders who want local validation.
- Easy to verify generated files.

### Watchouts

- More technical feel.
- The co-pilot must explain decisions plainly.

## Path 3: Codex

Best for OpenAI local agent workflows, implementation, browser checks, and repo validation.

Detailed lane doc: [CODEX_SETUP.md](CODEX_SETUP.md).

### Build Order

1. Open Codex in the starter-kit folder, project folder, or setup folder.
2. Paste `START_HERE.md`.
3. Run the diagnostic.
4. Use local file edits and validations.
5. Generate vault and prompt artifacts.
6. Run browser or app checks if the setup includes a UI.
7. Produce a concise QC summary.
8. Hand off any Claude-specific setup to the Claude lane if blended.

### Strengths

- Strong implementation loop.
- Good for local validation.
- Good paired with Claude for planning and review.

### Watchouts

- Do not assume Cowork tools exist.
- Keep ownership boundaries clear in blended mode.

## Path 4: Blended

Best when Claude and Codex should share one vault.

Detailed lane doc: [BLENDED_SETUP.md](BLENDED_SETUP.md).

### Build Order

1. Pick a lead coordinator.
2. Define ownership before file edits.
3. Create one shared vault.
4. Create one BRAIN_INDEX.
5. Create agent-specific inboxes and status files.
6. Assign Claude lane and Codex lane responsibilities.
7. Test one cross-agent command.
8. Test one save-up and reboot.
9. Run security and QC checks.

### Suggested Ownership

| Lane | Owns |
|---|---|
| Claude | Chief of Staff, planning, synthesis, long-running conversation, coaching |
| Claude Code | terminal-native implementation, local file work, repo operations when relevant, script execution |
| Codex | code edits, doc edits, browser checks, local validation, OpenAI-specific workflows |
| Human | approvals, sensitive data, publishing, paid services |

### Watchouts

- Never let two agents edit the same file at once.
- Use VaultBus for directives, not vague chat memory.
- Keep progress in the vault, not inside one model's conversation.

## Common Completion Criteria

Every path is complete only when:

- The vault exists.
- BRAIN_INDEX points to the core docs.
- VaultBus folders exist.
- Chief of Staff prompt exists.
- Specialist prompt exists.
- Progress file is current.
- Save-up and resume test passed.
- Vault lint has no broken links.
- Security review has no release blockers.
