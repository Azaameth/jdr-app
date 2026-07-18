# Issue Matrix — inventory-slots-dons-01KXRF5M

Authored retroactively (2026-07-18) during post-merge mission review — see
`mission-review.md` Gate 4. Rows are transcribed from the durable review
record in `status.events.jsonl` and `tasks/WP03-slot-editing/review-cycle-*.md`;
no new issues were discovered while authoring this file.

| issue | title | verdict | evidence_ref | wp | fr | nfr |
|-------|-------|---------|---------------|-----|-----|-----|
| ISSUE-1 | PlayerView save/delete wiring (handleSlotSave/handleSlotDelete) had zero integration-path test coverage — nothing proved a rejected save kept the modal open with the French error, or that a successful save/delete closed it | fixed | commit c51d418 — 5 PlayerView-level tests (mount → slot-click → modal submit/delete, success + category-full failure paths); raised in review-cycle-1.md, verified closed in the cycle-2 approval (status.events.jsonl event 01KXS0ZKV7AHNX84GSENJS8TDC) | WP03 | FR-003 | |
| ISSUE-2 | E2e coverage proves only the auth-guard redirect, not authenticated inventory/dons content rendering | deferred-with-followup | Follow-up: build an e2e auth fixture to unlock content-level smoke for the player/castes routes — recorded as follow-up (3) in the WP05 approval (status.events.jsonl event 01KXS42PVBMNNV84MF0PRZRRC0); same standing gap as faction-caste-browser-01KXBRY3 ISSUE-4, now deferred by two consecutive missions | WP05 | | |
| ISSUE-3 | No test asserts the literal "Dons" h2 heading (PlayerView.vue:580), so e2e/inventory.spec.ts's comment slightly overstates PlayerView.spec.ts coverage | deferred-with-followup | Follow-up: add the heading assertion alongside the e2e auth-fixture work (ISSUE-2) — recorded as follow-up (1) in the WP05 approval (status.events.jsonl event 01KXS42PVBMNNV84MF0PRZRRC0) | WP05 | FR-006 | |
| ISSUE-4 | legacy-reference/README.md:21 still lists the inventory feature under "Known unported features" despite MIGRATION_BACKLOG.md item 1 moving to "Already covered" | deferred-with-followup | Follow-up: drop the stale line in a docs touch-up — recorded as follow-up (2) in the WP05 approval (status.events.jsonl event 01KXS42PVBMNNV84MF0PRZRRC0); pre-existing pattern, the file defers to the backlog as source of truth | WP05 | | |
