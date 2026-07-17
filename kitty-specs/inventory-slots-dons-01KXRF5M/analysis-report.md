---
schema_version: 1
artifact_type: spec-kitty.analysis-report
command: /spec-kitty.analyze
mission_slug: inventory-slots-dons-01KXRF5M
mission_id: 01KXRF5MZC0M9TV7DVCJ17Q086
generated_at: '2026-07-17T16:55:20.226589+00:00'
analyzer_agent: unknown
input_artifacts:
  spec.md:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/kitty-specs/inventory-slots-dons-01KXRF5M/spec.md
    sha256: 9b611af1676b3a8f01eea24880ffccdf462fc9b6aae0397f4294ac49846d1228
  plan.md:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/kitty-specs/inventory-slots-dons-01KXRF5M/plan.md
    sha256: 8541e7426da885c02df1d0deb67ae144c68690d3a20319b1889385863b7c6646
  tasks.md:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/kitty-specs/inventory-slots-dons-01KXRF5M/tasks.md
    sha256: 24aae640b8ccb99a19f5dc9cbce49c8f1243400b6c24b2c7cc7e0ffec7e2ad67
  charter:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/.kittify/charter/charter.md
    sha256: 9be3aa3adef52c6aeb2278637f52277850543b5302307689e7b10186f09e0c2b
verdict: ready
issue_counts:
  medium: 2
  high: 0
  critical: 0
  low: 2
  info: 0
findings:
- id: U1
  severity: medium
  category: underspecification
  summary: CharacterInventory contract omits the Firestore doc id, but updateInventoryItems/updateInventoryEquipment take inventoryId — the store has no typed source for it.
- id: G1
  severity: medium
  category: coverage
  summary: FR-009 server-side enforcement relies on the pre-existing deployed firestore.rules with no automated test; only UI gating is tested (WP03 T017).
- id: U2
  severity: low
  category: underspecification
  summary: InventoryItem.equipped is retained for doc compatibility but no requirement defines its behavior after weapons/armor move to separate lists (vestigial).
- id: A1
  severity: low
  category: ambiguity
  summary: NFR-004 (French tone consistency) has no measurable criterion; verification is human review only.
---

## Specification Analysis Report

Mission: `inventory-slots-dons-01KXRF5M` — artifacts analyzed: spec.md, plan.md, tasks.md (+ data-model.md, contracts/data-layer.md), against `.kittify/charter/charter.md`.

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| U1 | Underspecification | MEDIUM | contracts/data-layer.md (repository section); data-model.md `CharacterInventory` | `updateInventoryItems(inventoryId, …)` / `updateInventoryEquipment(inventoryId, …)` require the inventory doc id, but the `CharacterInventory` shape does not declare an `id` field, so `useInventoryStore` has no typed source for it. | Resolve in WP01 the way repo conventions already dictate (CLAUDE.md: map `{ id: doc.id, ...doc.data() }`): have `mapInventory` include `id: string` and add it to the `CharacterInventory` interface. Reviewer should verify the contract note during WP01 review; no artifact rewrite needed before implement. |
| G1 | Coverage | MEDIUM | spec.md FR-009/SC-005; tasks.md WP03 T017 | Server-side permission enforcement (owner-or-mj/admin) rests on the already-deployed `firestore.rules:119-127`; the mission tests only client-side gating. No emulator-based rules test exists in the repo. | Accepted risk consistent with the rest of the codebase (rules testing is tracked in README "Known follow-ups"). No action inside this mission; do not claim SC-005 is machine-verified. |
| U2 | Underspecification | LOW | data-model.md `InventoryItem.equipped` | `equipped?` is kept for doc compatibility, but once weapons/armor move to their own lists the flag has no defined behavior or UI. Current PlayerView shows an "équipé" badge that WP02 replaces. | Treat as vestigial: migration script should drop it from regenerated fixtures' backpack items (or leave absent); WP02 must not render it. Note for the WP01/WP02 reviewers. |
| A1 | Ambiguity | LOW | spec.md NFR-004 | "Consistent in tone with existing messages" is not measurable. | Acceptable for a hobby-scale French UI; verified by human review at WP gates. |

**Coverage Summary Table:**

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 categories+caps | Yes | T001, T008 | WP01/WP02 |
| FR-002 computed empty slots | Yes | T005 (freeSlots), T008, T022 | |
| FR-003 per-slot CRUD persisted | Yes | T004, T005, T014–T016 | |
| FR-004 weapons/armor lists+badges | Yes | T001, T009 | |
| FR-005 lossless parsing | Yes | T003, T007 | corpus enumerated in WP01 |
| FR-006 enriched dons + modal | Yes | T002, T006, T018–T020 | |
| FR-007 DONS_DATA migration | Yes | T006 | |
| FR-008 fixture migration | Yes | T006, T007 | |
| FR-009 edit permissions | Yes | T015, T017 | server side: see G1 |
| FR-010 passive "—" rendering | Yes | T006 (no zero synthesis), T018–T021 | |
| NFR-001 no-backend no-op | Yes | T004 (guards), T012, T024 | |
| NFR-002 lossless corpus 100% | Yes | T003, T006, T007 | |
| NFR-003 CI gates green per increment | Yes | T007, T024 | |
| NFR-004 French strings | Yes | T005, T014, T016 (French errors/labels) | see A1 |

**Charter Alignment Issues:** none. Layering (pure util → repository → store → UI), hand-rolled singleton stores, `if (!db)` guards, and the narrower-than-legacy permission model all conform; no MUST principle is violated.

**Unmapped Tasks:** none — every T001–T024 maps to at least one FR/NFR (T023 maps to charter DIR-002 docs-sync rather than an FR; intentional polish task).

**Metrics:**

- Total Requirements: 10 FR + 4 NFR + 7 C
- Total Tasks: 24 across 5 WPs (sequential lanes)
- Coverage: 100% of FRs have ≥1 task (10/10, also registered via map-requirements)
- Ambiguity Count: 1 (A1)
- Duplication Count: 0
- Critical Issues Count: 0

**Next Actions:** No CRITICAL/HIGH findings — proceed to `/spec-kitty.implement` (WP01). Carry U1 and U2 into the WP01 implementation/review as explicit checks (typed `id` on `CharacterInventory`; drop vestigial `equipped` from regenerated backpack fixtures). G1 stays an accepted, documented risk outside mission scope.
