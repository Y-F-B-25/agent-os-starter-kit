# Codex Setup

Use this path when the user wants OpenAI local agent support, implementation work, and browser or app validation.

## Best Fit

- User wants Codex as the local implementation agent.
- File changes, repo changes, code review, or local UI checks matter.
- The user wants Claude and OpenAI agents to share a vault later.
- The setup needs strong verification.

## Co-Pilot Responsibilities

- Inspect workspace state before edits.
- Run `git status` only if the workspace is a git repo.
- Use existing project conventions.
- Patch docs, prompts, scripts, or UI files directly.
- Run local validation.
- Avoid assuming Claude-only tools exist.
- Record Codex ownership in the vault if blended mode is selected.

## User Responsibilities

- Open Codex in the starter-kit folder, project folder, or setup folder.
- Approve sensitive actions.
- Provide screenshots or browser context when needed.
- Decide whether Codex stays solo or joins a blended setup.

## First Pass Checklist

- [ ] Workspace state checked.
- [ ] `git status` checked if the workspace is a git repo.
- [ ] Diagnostic complete.
- [ ] Codex lane selected or blended ownership written.
- [ ] Vault files created or verified.
- [ ] Generated docs validated.
- [ ] Browser or local app checks run when relevant.
- [ ] Handoff test passed.

## Common Failure Modes

- Codex edits public docs but does not update setup prompts.
- Claude-specific assumptions leak into Codex instructions.
- The repo lacks a clear QC gate.
- Blended mode starts without file ownership rules.

## Finish Line

The Codex lane is ready when Codex can make a scoped file or repo change, validate it, write a handoff, and leave the next agent a clear starting point.
