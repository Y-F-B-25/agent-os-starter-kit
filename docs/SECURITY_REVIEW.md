# Public Security Review

Run this before publishing or sharing Agent OS.

## Release Rule

Do not publish until security review passes. If a finding is unclear, treat it as a blocker until reviewed.

## Must Not Ship

- credential values
- API keys or tokens
- private Command Center implementation
- private group chat internals
- private inbox exports
- private routes or localhost-only internal URLs presented as public services
- personal client data
- real production incident details that are not already public
- backup snapshots with private content
- unreviewed old repo history that contains removed onboarding flows, screenshots, exports, or implementation artifacts

## Allowed Public Patterns

- generic VaultBus protocol
- example inbox format
- example status files
- example handoff
- placeholder env var names
- local-only watcher pattern with user approval
- generic Notion dashboard schema
- vault lint routines
- token sweep routine without printing token values

## Token Sweep Checklist

Search:

- repo files
- docs
- examples
- vault template
- chat or inbox samples
- git history if the repo was previously pushed

Look for:

- common API key prefixes
- bearer tokens
- private keys
- `.env` contents
- webhook URLs
- database URLs
- cloud provider tokens

Report:

- file path
- line number
- token family or pattern
- severity
- remediation

Never print the value.

## Watcher Safety

Watcher docs must say:

- run locally only
- do not expose to the public internet
- require allowlists for commands
- require user approval for destructive operations
- do not pass secrets through command files
- log commands without credential values

## Blended Safety

When Claude and Codex share a vault:

- one agent owns a file at a time
- credentials stay in env vars or keychain
- private screenshots are not copied into public docs
- security review happens before public release
- handoffs summarize sensitive events without raw secrets

## Release Decision

If the working tree is clean but git history contains old public-inappropriate material, do not publish from that history. Use a clean release repository or squash to a reviewed first public commit.

Use this status:

| Status | Meaning |
|---|---|
| GREEN | No known blocker |
| YELLOW | Safe for private testing, not public release |
| RED | Do not share |

Record the final decision in `docs/REPO_QC.md` or the release issue.
