# Cowork Prerequisites

Use this when the diagnostic recommends the Cowork lane.

## What Cowork Means Here

Cowork is the Claude desktop app experience where the user can work with a chat-first co-pilot and a mounted local folder. Availability and naming may change, so the co-pilot should describe the capability plainly: "Claude with access to the folder you choose."

## Before Starting

The user needs:

- Claude desktop installed.
- Access to Cowork or a Claude desktop mode that can read and write a selected folder.
- A local folder for Agent OS, such as `~/Desktop/Agent OS`.
- Permission to let the co-pilot create files inside that folder.

## Mounting The Folder

Tell the user:

1. Open Claude desktop.
2. Start a new Cowork or folder-enabled session.
3. Choose the Agent OS folder when prompted.
4. Paste `START_HERE.md` as the first message.

If the user cannot mount a folder, switch to Claude Code or Codex setup instead.

## Research Preview Caveat

If Cowork is presented as a research preview or changes its UI:

- Do not pretend the button names are stable.
- Ask the user for a screenshot if the folder picker is not visible.
- Keep the vault and progress file local so another lane can continue.

## What The Co-Pilot Can Do

- Create and edit files in the mounted folder.
- Write boot prompts.
- Maintain the progress file.
- Guide app setup.

## What The User Still Does

- Opens new sessions.
- Pastes boot prompts.
- Approves Notion or local tool access.
- Approves watcher commands if the watcher is used.
