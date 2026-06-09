# Claude Code Setup

Use this path when the user wants terminal-native setup, local file work, or repo work.

## Best Fit

- Builder or Deep Worker.
- Comfortable with shell output. Git helps, but is not required.
- Wants generated files to be validated locally.
- Wants the co-pilot to run checks instead of only describing setup.

If the mounted folder is a git repo and git is new, ask the co-pilot for a two-minute primer on `status`, `diff`, `commit`, and `branch` before continuing. The co-pilot should explain command output in plain language.

## Co-Pilot Responsibilities

- Inspect workspace state before edits.
- Run `git status` only if the workspace is a git repo.
- Run the diagnostic.
- Patch files directly.
- Run validation commands.
- Keep file changes visible.
- Write Chief of Staff and specialist prompts.
- Run the handoff and resume test.

## User Responsibilities

- Open Claude Code in the starter-kit folder, project folder, or setup folder.
- Approve file edits and tool installation.
- Review command results when the co-pilot flags them.
- Start additional sessions when needed.

## First Pass Checklist

- [ ] Workspace state checked.
- [ ] `git status` checked if the workspace is a git repo.
- [ ] Diagnostic complete.
- [ ] Vault files created or verified.
- [ ] Schema docs present.
- [ ] Progress file valid JSON.
- [ ] Markdown links checked.
- [ ] Handoff test passed.
- [ ] Security sweep queued before publish.

## Common Failure Modes

- The co-pilot writes a nice plan but does not patch files.
- The co-pilot skips validation.
- The user gets too much terminal detail.
- Generated prompts point to files that do not exist.

## Finish Line

The Claude Code lane is ready when a fresh session can read the vault, run the next setup step, and pass the relevant local checks. If the user is working in a git repo, include repo QC.
