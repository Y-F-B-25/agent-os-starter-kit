# Vault Lint — Structural Health Check

---

## What This Is

Vault Lint is a periodic health check that prevents your Obsidian vault from decaying as documents accumulate. Run it after major changes and at least every 48 hours of active use.

---

## What to Check

### 1. Structural Integrity
- Are there orphan files (files not registered in BRAIN_INDEX)?
- Are there empty directories that should be cleaned up?
- Do folder names follow the `NN — Name` convention?
- Are there stray files in the vault root?

### 2. Registry Consistency
- Does every file referenced in BRAIN_INDEX actually exist?
- Does every important file in the vault have a BRAIN_INDEX entry?
- Is SESSION_REGISTRY.md current with all completed sessions?
- Do VaultBus status files match actual agent states?

### 3. Content Health
- Are any handoff documents stale (referencing work that's been superseded)?
- Are session READMEs up to date?
- Do cross-references between documents still resolve?
- Are there contradictions between documents?

### 4. Security
- Are there credentials or tokens outside `01 — Security/` or `04 — Operations/Credentials/`?
- Are there `.env` files or secrets committed to any git repo in the projects folder?
- Do any documents inline credential values instead of referencing secure locations?

---

## Issue Severity

| Level | Meaning | Action |
|-------|---------|--------|
| **CRITICAL** | Data integrity or security risk | Fix immediately. Create a VaultBus escalation. |
| **WARNING** | Could cause confusion for agents | Fix before next milestone. |
| **INFO** | Cosmetic or low-impact | Fix when convenient. |

---

## Trigger System

Run lint when:
- After every 5 new file creations (ingests)
- After a major deliverable is completed
- After adding a new project or agent
- After any vault restructuring
- On a 48-hour timer (if actively using the system)

---

## Linking Pass

A linking pass is a special lint mode focused on improving vault connectivity. It adds wikilinks between related documents without rewriting content.

### What a Linking Pass Does
- Scans all `.md` files for orphans (0 inbound links) and weak links (1 inbound link)
- Adds wikilinks in natural inline positions or "See also" / "Version Index" sections
- Connects session READMEs to their handoffs, boot prompts, and related project notes
- Cross-links architecture docs, operations docs, and VaultBus views
- Never rewrites existing content — only adds links

### Metrics to Track
- Orphan count (before/after)
- Weak link count (before/after)
- Connected files count (2+ inbound links, before/after)
- Total wikilinks added
- Files edited

### Acceptable Orphans
VaultBus command/inbox files are ephemeral by design (directives, acknowledgments, routing messages). These do not naturally warrant inbound wikilinks and are not considered defects.

---

## How to Run

Any agent can run lint. The procedure:

1. Scan all vault directories recursively
2. Run each check category against the file tree
3. Cross-reference BRAIN_INDEX, SESSION_REGISTRY, and VaultBus status files
4. If doing a linking pass, scan for orphans/weak links and add wikilinks
5. Generate report at `04 — Operations/lint-reports/`
6. If any CRITICAL issues found, create a VaultBus escalation
7. Update the lint trigger counter (reset after run)

Output reports to `04 — Operations/lint-reports/` with the date and findings. Format:

```
# Vault Lint Report — [DATE]
**Triggered by:** [context trigger name or "48h time trigger"]
**Run by:** [agent name]

## Summary
- Issues found: N
- Critical: X
- Warning: Y
- Info: Z

## Linking Pass Summary (if applicable)
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Orphans | X | Y | -Z |
| Weak links | X | Y | -Z |
| Connected (2+) | X | Y | +Z |
| Total wikilinks | X | Y | +Z |

## Issues

### [CRITICAL] Issue title
- **Check:** Which check caught this
- **Location:** File path
- **Problem:** What's wrong
- **Fix:** Recommended action

### [WARNING] Issue title
...

### [INFO] Issue title
...

## Vault Stats
- Total files: N
- Registered in BRAIN_INDEX: N
- Orphan pages: N
- Empty directories: N
- Last lint: [DATE]
```

See `04 — Operations/lint-reports/` for example reports.
