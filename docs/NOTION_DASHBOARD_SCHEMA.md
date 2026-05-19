# Notion Dashboard Schema

Notion is optional. The default visual layer is the local HTML dashboard. When Notion is connected, it acts as a user-friendly coordination hub for Agent OS setup and agent status. The vault progress file remains canonical.

The repo does not create or ship a private Command Center. A user can run setup with:

- the progress JSON only
- the progress JSON plus the local HTML dashboard
- the progress JSON plus the local HTML dashboard and a Notion coordination hub

If Notion and the vault disagree, trust the vault.

## Page

Create one top-level page:

```text
[Name]'s Agent OS
```

## Sections

- Profile card
- Progress summary
- Quest tracker
- Agent status
- Getting unstuck note

## Quest Tracker Database

```sql
CREATE TABLE (
  "Quest" TITLE,
  "Status" SELECT('Not Started':gray, 'In Progress':yellow, 'Completed':green, 'Skipped':purple),
  "Difficulty" SELECT('1 - Easy':green, '2 - Straightforward':blue, '3 - Moderate':yellow, '4 - Challenging':orange, '5 - Struggled':red),
  "Est. Minutes" NUMBER,
  "Actual Minutes" NUMBER,
  "Magic Moment" RICH_TEXT,
  "Notes" RICH_TEXT,
  "Started" DATE,
  "Completed" DATE
)
```

Default view: board grouped by Status.

## Agent Status Database

```sql
CREATE TABLE (
  "Agent" TITLE,
  "Role" RICH_TEXT,
  "Status" SELECT('Idle':gray, 'Working':yellow, 'Blocked':red, 'Done':green),
  "Current Task" RICH_TEXT,
  "Last Updated" DATE,
  "Needs Attention" CHECKBOX
)
```

## Profile Card

```markdown
> **Profile**
> Lane: [cowork | claude_code | codex | blended]
> Goal: [primary goal]
> Success test: [success test]
> First team: [lead agent] + [specialist agent]
```

## Progress Summary

```markdown
> **Progress**
> Quests: [completed]/[total]
> Handoff test: [not run | passed | failed]
> Vault lint: [not run | passed | warnings | failed]
> Security review: [not run | green | yellow | red]
```

## Getting Unstuck

```markdown
> **Stuck?**
> Take a screenshot, paste it into the co-pilot chat, and describe what you see.
```

## Update Rule

After every quest transition:

1. Update the canonical `onboarding-progress.json` file.
2. Update the Notion row if Notion is connected.
3. Update the local HTML dashboard if the user chose one.
4. If Notion, HTML, and the vault disagree, trust the vault.

## Local HTML Dashboard

The setup co-pilot creates a simple local HTML dashboard by default. See [LOCAL_DASHBOARD.md](LOCAL_DASHBOARD.md) and `examples/dashboards/setup-progress-dashboard.html`.

It should show:

- diagnostic profile and chosen lane
- quest progress from Q0 to Q8
- current blocker or next action
- handoff test status
- vault lint status
- security review status
- lessons captured from setup friction

The HTML dashboard should not store private chat, credentials, client names, or raw inbox exports. It should mirror the progress JSON in a friendly visual form.
