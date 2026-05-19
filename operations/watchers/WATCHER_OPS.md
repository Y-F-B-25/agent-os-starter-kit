# Watcher Bridge

The watcher is optional. Use it only when a chat-first agent cannot run a local check directly and the user wants to approve each command in a terminal.

Claude Code and Codex usually do not need the watcher because they can run local commands directly.

## Public Posture

The public starter watcher is approval-required and conservative.

- No command token is placed in command files.
- No freeform shell strings are accepted.
- Commands must be `argv` arrays.
- The user must approve each command in the terminal.
- Output is redacted before it is written to the outbox.
- The watcher is not required for research, writing, planning, or ordinary vault work.

## Start The Watcher

```bash
cd ~/Desktop/[Your Folder]/
python3 operations/watchers/cowork_watcher.py
```

The watcher polls:

```text
operations/watchers/_cowork_inbox.json
```

and writes:

```text
operations/watchers/_cowork_outbox.json
```

Both files are ignored by git.

## Command Format

Agents write an inbox file like this:

```json
{
  "id": "check_project_build",
  "argv": ["npm", "run", "build"],
  "workdir": "~/Desktop/[Your Folder]/Projects/[Project]",
  "reason": "Verify the project builds before reporting done.",
  "timeout": 120
}
```

The watcher then asks the user in the terminal:

```text
Run this command? Type yes to approve:
```

If the user types anything other than `yes`, the watcher rejects the command.

## Safety Rules

- Do not put credential values in inbox files.
- Do not run commands that print secrets.
- Do not use the watcher for destructive operations.
- Do not expose the watcher on a network port.
- Do not broaden the allowlist until the user understands the risk.
- Keep `_cowork_inbox.json`, `_cowork_outbox.json`, and `_cowork_watcher.log` out of git.

## Allowlist

The starter allowlist is intentionally small:

```text
python3, python, git, npm, node, ls, pwd, mkdir, find, open
```

Add project-specific commands only after reviewing the risk.

## When To Use It

Use the watcher for:

- a Cowork setup that needs a local build check
- a Cowork setup that needs a local script run
- a user-approved git status or local diagnostic

Do not use the watcher for:

- secret handling
- broad shell access
- background automation
- commands the user has not approved

## Verification Rule

Verification should match the setup lane.

- Cowork may use the watcher when it cannot run local checks directly.
- Claude Code should run local checks directly.
- Codex should run local checks directly.
- Blended setups should assign one owner for each verification task.
