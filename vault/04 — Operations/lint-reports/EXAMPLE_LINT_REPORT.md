# Vault Lint Report - YYYY-MM-DD (Example)
**Triggered by:** New agent creation (example trigger)
**Run by:** Admin Agent v1

> This is an example lint report showing the expected format and severity levels. Delete or replace this file after your first real lint run.

## Summary
- Issues found: 5
- Critical: 1
- Warning: 2
- Info: 2

## Linking Pass Summary

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total .md files | 45 | 46 | +1 (this report) |
| Orphans (0 inbound links) | 8 | 3 | -5 |
| Weak links (1 inbound link) | 12 | 5 | -7 |
| Connected (2+ inbound links) | 25 | 38 | +13 |
| Total wikilinks in vault | 30 | 62 | +32 |

**Files edited:** 10 files received new wikilinks

## Issues

### [CRITICAL] Credential pattern found in vault
- **Check:** Security - credential exposure
- **Location:** `08 — Handoffs/agent-v1-to-v2.md`
- **Problem:** Credential-shaped value found inline in a handoff document. Credential values should never be written into agent-readable files.
- **Fix:** Remove the value. Reference the approved environment variable or Keychain item by name only, then rotate if exposure is possible.

### [WARNING] SESSION_REGISTRY is stale
- **Check:** Registry consistency
- **Location:** `05 — Sessions/SESSION_REGISTRY.md`
- **Problem:** Shows Admin at v1, but BRAIN_INDEX says v5. Significant drift.
- **Fix:** Refresh SESSION_REGISTRY to match BRAIN_INDEX, or deprecate in favor of BRAIN_INDEX's agent table.

### [WARNING] Session README outdated
- **Check:** Content health
- **Location:** `05 — Sessions/Admin/README.md`
- **Problem:** README says "Current: v1" but agent is at v5.
- **Fix:** Agent should refresh README prose during next session.

### [INFO] VaultBus command orphans (3 files)
- **Check:** Orphan pages
- **Location:** `09 — VaultBus/20 — Commands/inbox/`
- **Problem:** Command files have no inbound links.
- **Assessment:** By design. Command messages are ephemeral. No action needed.

### [INFO] Empty directory
- **Check:** Structural integrity
- **Location:** `09 — VaultBus/30 — Escalations/closed/`
- **Problem:** Empty folder kept as part of the VaultBus structure.
- **Fix:** Low priority. Remove if not needed, or keep as placeholder.

## Vault Stats
- **Total files:** 46 (.md only)
- **Registered in BRAIN_INDEX:** ~25
- **Orphan pages:** 3 (all VaultBus commands, acceptable)
- **Empty directories:** 2
- **Last lint:** YYYY-MM-DD (this report)
