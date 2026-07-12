# Issue Matrix — faction-caste-browser-01KXBRY3

| issue | title | verdict | evidence_ref | wp | fr | nfr |
|-------|-------|---------|---------------|-----|-----|-----|
| ISSUE-1 | Unit test fixtures didn't exercise FR-002 (facts-grid, 2-vs-4-cell layout) | fixed | commit 0ed985e — added "renders subtitle, badge, description and a facts grid sized to the faction" test, found during WP01 review | WP01 | FR-002 | |
| ISSUE-2 | No dedicated automated test for the sub-100ms tab-switch budget | deferred-with-followup | Follow-up: accepted in analysis-report.md finding A2 (medium, non-blocking) — activeIndex is a synchronous ref with no network round-trip, so the budget is structurally satisfied by the architecture; a timing assertion would be low-value and flaky | WP01 | | NFR-001 |
| ISSUE-3 | No dedicated automated test for 360px-wide responsive tab wrapping | deferred-with-followup | Follow-up: accepted in analysis-report.md finding A2 (medium, non-blocking) — CSS-only (flex-wrap) behavior; needs a real browser layout engine to verify meaningfully, not covered by Vitest's jsdom environment | WP01 | | NFR-002 |
| ISSUE-4 | E2e coverage proves only the auth-guard redirect, not authenticated faction-content rendering | deferred-with-followup | Follow-up: accepted in analysis-report.md finding A3 (low, non-blocking) — no authenticated-session fixture exists anywhere in this e2e suite yet; scope documented explicitly in e2e/castes.spec.ts and WP01 task T007 | WP01 | FR-001 FR-002 | |
