# Getting Started with Agent OS Starter Kit

Agent OS Starter Kit starts with a setup co-pilot. You paste [START_HERE.md](START_HERE.md) into the tool you want to use, answer the diagnostic, and let the co-pilot build the first version of your system.

## Choose A Lane

You do not need to know the right answer before you begin. The setup co-pilot will recommend a lane after the diagnostic.

| Lane | Choose this if | Main tradeoff |
|---|---|---|
| Cowork | You want a chat-first Claude setup with file access | Easy to manage, less terminal-native |
| Claude Code | You want terminal-native setup and repo work | Strong local execution, more technical feel |
| Codex | You want OpenAI local agent support for code and browser checks | Strong implementation lane, newer operating pattern |
| Blended | You want Claude and Codex in the same vault | Most powerful, needs clearer ownership rules |

## Quick Start

1. Clone or download this repo into a folder you control, such as `~/Desktop/Agent OS Starter Kit`.
2. Open your chosen co-pilot tool with the starter-kit folder available. If you use Cowork, mount the folder that contains this repo so the co-pilot can read `START_HERE.md`, `docs/`, `operations/`, and `vault/`.
3. Copy the full contents of [START_HERE.md](START_HERE.md).
4. Paste it as the first message.
5. Answer the diagnostic in plain English.
6. Let the co-pilot create files, prompts, progress tracking, and the first handoff test.
7. Optional: if you want the fuller local app experience, open [command-center/README.md](command-center/README.md) and run Command Center against your own vault.

## What The Co-Pilot Builds

- An Obsidian-compatible vault structure.
- A `BRAIN_INDEX.md` so agents know where to start.
- A VaultBus folder for status, commands, and event logs.
- A progress file at `vault/04 — Operations/onboarding-progress.json`.
- Optional Notion dashboard tracking setup quests.
- Optional Command Center app for local group chat, routines, agent telemetry, project views, and map-style coordination.
- A Chief of Staff boot prompt.
- One specialist agent boot prompt.
- A save-up and handoff test.
- Vault lint and eval records.
- A skills pack for retrieval, lint, handoffs, security checks, dashboards, evals, and recursive improvement.

## What You Do

- Answer diagnostic questions.
- Approve tool choices.
- Open apps when the co-pilot cannot do that directly.
- Paste boot prompts into new sessions when needed.
- Confirm screenshots or visible results.
- Decide whether to continue with one lane or move to blended mode.

## Helpful Tools

- **Obsidian:** recommended for browsing the vault.
- **Notion:** optional dashboard for progress and agent status.
- **Voice dictation:** useful for giving high-level direction quickly.
- **Git:** recommended once the repo is stable enough to version.
- **Python 3:** needed for Vault Lint, retrieval, and optional watcher checks. On a fresh Mac, installing Python may trigger Apple's command line tools prompt.

## Stuck?

Take a screenshot, paste it into the co-pilot chat, and describe what you see. The setup flow is designed so the user is never expected to debug silently.

## Read Next

- [docs/DIAGNOSTIC.md](docs/DIAGNOSTIC.md) for the diagnostic logic.
- [docs/SETUP_PATHS.md](docs/SETUP_PATHS.md) for the four setup lanes.
- [docs/COWORK_SETUP.md](docs/COWORK_SETUP.md), [docs/CLAUDE_CODE_SETUP.md](docs/CLAUDE_CODE_SETUP.md), [docs/CODEX_SETUP.md](docs/CODEX_SETUP.md), and [docs/BLENDED_SETUP.md](docs/BLENDED_SETUP.md) for lane-specific setup.
- [docs/PLAYBOOKS.md](docs/PLAYBOOKS.md) for operating routines.
- [command-center/README.md](command-center/README.md) for the optional local Command Center app.
- [docs/SKILLS_PACK.md](docs/SKILLS_PACK.md) for what the starter kit teaches and installs.
- [docs/EVALS.md](docs/EVALS.md) for quality checks.
- [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) before public release.
