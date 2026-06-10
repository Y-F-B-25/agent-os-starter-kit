# Example Handoff: website-agent v2 to v3

> This is a fictional example showing what a good handoff document looks like. Use it as a reference when writing your own.

---

## What v2 Accomplished

1. **Homepage hero section** - Built responsive hero with headline, subheadline, and CTA button. Deployed via watcher. Verified live at https://example.com.
2. **Navigation bar** - Sticky nav with 4 links (Home, About, Projects, Contact). Mobile hamburger menu works on viewport < 768px.
3. **Footer** - Social links + copyright. Matches design spec from `Projects/Website/design-spec.md`.

## What's NOT Done

- **About page** - Content approved by the human (see `06 — Decisions/2026-01-20-about-copy.md`) but not yet built. Start with the layout notes in `Projects/Website/about-wireframe.md`.
- **Contact form** - Needs backend. The human said to use Formspree for now (decision logged).
- **Performance audit** - Lighthouse score not checked. Should be >90 before v3 finishes.

## Key Decisions Made During v2

- The human chose a dark theme over light. All color variables are in `styles/theme.css`.
- CTA button links to Calendly, not a contact form. This may change. Check with the human.
- Images are served from `/public/images/`, not a CDN. Fine for now, revisit at scale.

## Known Issues

- Hero image is 2.4MB and needs compression before production. Flagged but not fixed.
- Mobile nav animation stutters on Safari. CSS-only approach may need JS fallback.

## Files Touched

| File | Action |
|------|--------|
| `Projects/Website/index.html` | Major edits: hero, nav, footer |
| `Projects/Website/styles/theme.css` | Created dark theme variables |
| `Projects/Website/styles/nav.css` | Created nav and mobile styles |
| `[Your Vault]/05 — Sessions/Website/README.md` | Updated with v2 entry |
| `[Your Vault]/09 — VaultBus/10 — Status/website-agent.md` | Updated to `done` |

## What v3 Should Do First

1. Read the about page wireframe notes at `Projects/Website/about-wireframe.md`
2. Build the about page using the approved copy from the decision log
3. Compress the hero image (target: <500KB)
4. Run a Lighthouse audit and fix anything below 90
