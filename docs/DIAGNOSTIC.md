# Agent OS Diagnostic

The diagnostic decides what to build first, which setup lane to use, and how much scaffolding the user needs.

## Goals

- Recommend Cowork, Claude Code, Codex, or blended setup.
- Pick the first agent team.
- Detect existing tools without touching existing private data.
- Create a measurable success test.
- Seed the onboarding eval.

## Questions

| Order | Question | Why it matters |
|---|---|---|
| 1 | What do you want this system to help with first? | Anchors the build in a real use case |
| 2 | After defining the profiles in one sentence each, which profile fits: Organizer, Deep Worker, Enterprise Operator, Builder, Team Lead? | Sets pacing and examples |
| 3 | Where are you already using AI? | Avoids re-teaching what they know |
| 4 | What operating system are you on? | Determines scripts and watcher guidance |
| 5 | How often do you use the terminal: never, rarely, sometimes, or every day? | Adds an inferential setup-lane signal |
| 6 | Do you already have Obsidian, Notion, or a project folder you care about? | Prevents overwriting existing systems |
| 7 | Based on the user's goal, propose the first two agents and ask the user to confirm or correct. | Builds a real team, not a demo |
| 8 | What data or repos should this system avoid? | Sets safety boundaries |
| 9 | What would prove this worked today? | Creates the graduation test |

## Profiles

| Profile | Signs | Setup bias |
|---|---|---|
| Organizer | Many scattered AI chats, wants continuity | Cowork preferred, or blended once the Cowork loop works |
| Deep Worker | Already uses AI heavily, wants lower overhead | Claude Code or blended |
| Enterprise Operator | Needs repeatable rollout and governance | Cowork first, security and evals early |
| Builder | Wants to edit repos and run checks | Claude Code or Codex |
| Team Lead | Wants agents assigned to workstreams | Blended or Cowork first |

## Lane Scoring

Score each signal from 0 to 3, then sum the totals for each lane.

| Signal | Cowork | Claude Code | Codex | Blended |
|---|---:|---:|---:|---:|
| Wants chat-first management | +3 | +0 | +1 | +1 |
| Wants terminal and git work | +0 | +3 | +2 | +2 |
| Wants OpenAI local agent implementation | +0 | +1 | +3 | +2 |
| Wants multiple model families | +0 | +1 | +1 | +3 |
| Beginner or low setup confidence | +3 | +0 | +1 | +0 |
| Existing repo-heavy workflow | +0 | +3 | +3 | +2 |
| Needs governance and rollout | +2 | +1 | +1 | +3 |

Recommend the highest lane. If blended wins but the user is new, start with one lead lane and add the second after the save-up loop works.

## First Agent Team

| User goal | Chief of Staff | Specialist |
|---|---|---|
| Personal organization | Admin agent | Life admin or project agent |
| Serious project work | Admin agent | Project agent |
| Research and writing | Admin agent | Research or writing agent |
| Codebase work | Admin agent | Engineering agent |
| Security-sensitive work | Admin agent | Security verifier |
| Team rollout | Admin agent | Ops or training agent |

## Success Test

A good success test is visible and small.

Examples:

- "My Chief of Staff can read the vault and tell me what is active."
- "A specialist agent can write a handoff, and the next session resumes."
- "The vault lint report has no broken links."
- "The Notion dashboard shows setup progress."
- "Claude and Codex can share the vault without editing the same file."

## Eval Baseline

Estimate 1 to 5 for:

- agent setup
- memory management
- multi-agent handoff
- prompt engineering
- system design
- local tooling confidence

The estimate is not a grade. It only controls how much explanation the co-pilot gives.
