# Local HTML Dashboard

The local HTML dashboard is the default visual progress layer for setup.

The source of truth is still `onboarding-progress.json`. The dashboard is a readable display layer that the setup co-pilot updates after quest transitions.

## When To Use It

Use the local dashboard when:

- the user wants visible quest progress
- the setup should stay local
- a clean-room QA run needs visual evidence
- Notion is not connected yet or is not desired

## Starter File

Use:

```text
examples/dashboards/setup-progress-dashboard.html
```

The setup co-pilot should copy it into the user's vault or project folder during Q0, then replace the embedded sample data with the current progress data.

## Required Display

The dashboard should show:

- chosen setup lane
- profile and success test
- quest progress from Q0 to Q8
- current blocker or next action
- handoff test status
- Vault Lint status
- security review status
- lesson loop count

## Update Rule

After each quest transition:

1. Update `onboarding-progress.json`.
2. Update the local dashboard if the user chose it.
3. Record friction and difficulty when useful.
4. Treat the JSON as correct if the dashboard disagrees.

## Privacy Rule

Do not put credential values, raw chat, raw inbox files, private screenshots, or client-sensitive details in the dashboard. Use short summaries.
