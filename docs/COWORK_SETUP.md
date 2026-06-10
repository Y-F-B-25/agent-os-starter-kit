# Cowork Setup

Use this path when the user wants a chat-first Claude setup.

## Best Fit

- Beginner or non-terminal user.
- Wants a friendly setup co-pilot.
- Wants to manage agents through conversation.
- Wants Notion or Obsidian guidance.

Prerequisites: [COWORK_PREREQS.md](COWORK_PREREQS.md).

## Co-Pilot Responsibilities

- Run the diagnostic.
- Create the vault files in the mounted folder.
- Explain each folder in plain English.
- Write the Chief of Staff boot prompt.
- Write one specialist boot prompt.
- Guide the user to paste prompts into new Cowork sessions.
- Update `onboarding-progress.json`.

## User Responsibilities

- Mount the starter-kit folder, or the parent folder that contains it.
- Approve the setup lane.
- Open Obsidian or Notion when asked.
- Paste boot prompts into new sessions.
- Confirm visible results.

## First Pass Checklist

- [ ] Folder mounted.
- [ ] Diagnostic complete.
- [ ] Vault folders created.
- [ ] BRAIN_INDEX created.
- [ ] VaultBus created.
- [ ] Progress file created.
- [ ] Chief of Staff prompt written.
- [ ] Specialist prompt written.
- [ ] Save-up loop tested.

## Common Failure Modes

- User mounts a blank folder and the co-pilot cannot access the starter-kit docs or operations scripts.
- Co-pilot assumes Notion is connected when it is not.
- New agent sessions are opened before the first prompt is ready.
- Handoff test is skipped because the user feels "done" too early.

## Finish Line

The Cowork lane is ready when the user can open the Chief of Staff session, ask what is active, and get an answer grounded in the vault.
