---
schema_version: 1
artifact_type: spec-kitty.analysis-report
command: /spec-kitty.analyze
mission_slug: equipment-stat-effects-01KY2MYD
mission_id: 01KY2MYD1E6RR7PW4T7A9VZ3GV
generated_at: '2026-07-21T16:03:32.963766+00:00'
analyzer_agent: unknown
input_artifacts:
  spec.md:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/kitty-specs/equipment-stat-effects-01KY2MYD/spec.md
    sha256: 97b4667ad60a1b95c0e5c8f34723e24d40008ac47b82c890cc699e0847e2f07a
  plan.md:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/kitty-specs/equipment-stat-effects-01KY2MYD/plan.md
    sha256: 6f798398ebb2b1345b358b441fdb2c86146e524c0ced8da6002c02296270b820
  tasks.md:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/kitty-specs/equipment-stat-effects-01KY2MYD/tasks.md
    sha256: 1e89c8467c6156dc9f809ff1bd75e841b182d3aa299e191ea610cdd65d53e9a7
  charter:
    path: /srv/dev-disk-by-uuid-880448de-a6f5-449f-a238-d5306ef7c278/programming/monthie/jdr-app/.kittify/charter/charter.md
    sha256: 9be3aa3adef52c6aeb2278637f52277850543b5302307689e7b10186f09e0c2b
verdict: blocked
issue_counts:
  medium: 1
  low: 0
  critical: 2
  high: 1
  info: 0
findings:
- id: A1
  severity: critical
  category: charter
  summary: plan.md/quickstart.md claim e2e is not required, contradicting the charter's Quality Gate for changes touching a full view (WP02 modifies PlayerView.vue).
- id: A2
  severity: critical
  category: charter
  summary: plan.md's Charter Check promises a MIGRATION_BACKLOG.md/NEXTSTEPS.md doc-sync update (DIR-002, and CLAUDE.md's increment-ledger mandate) but no task in tasks.md performs it.
- id: A3
  severity: high
  category: coverage
  summary: NFR-002's child-vs-parent isolation combination has no automated test at the layer where the real risk lives (PlayerView.vue's activeChildEquipment wiring) — only the pure function and the store cache are tested.
- id: A4
  severity: medium
  category: underspecification
  summary: WP01 T004 doesn't name the exact pre-existing target item for the seed-fixture task, even though it already exists (mwassa/inv-9-anneau-de-mana), and the backlog's 'Mwasa' spelling doesn't match the actual character 'Mwassa Mekhsitt'.
---

## Specification Analysis Report

**Mission**: `equipment-stat-effects-01KY2MYD` | **Branch**: `feat/equipment-stat-effects`
**Artifacts analyzed**: spec.md, plan.md, research.md, data-model.md, tasks.md, WP01/WP02 prompt files, `.kittify/charter/charter.md`

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| A1 | Charter Alignment | CRITICAL | plan.md (Technical Context, "Testing" line); quickstart.md ("Validate the UI"); tasks/WP02-display-wiring.md (Definition of Done) | The charter's Quality Gates section states `npm run test:e2e` "is required for changes touching routing, auth, or a full view." WP02 modifies `PlayerView.vue`, which is the character-sheet route's full view. plan.md's Technical Context instead states e2e "is not required to grow for this mission... display-only change to existing sheets," and quickstart.md repeats "no new e2e spec is required by this mission's FRs." WP02's Definition of Done never mentions `npm run test:e2e` at all. | Correct plan.md's wording: the *existing* `e2e/vitruve.spec.ts` suite must still be run and stay green as part of WP02's gate (it currently only smoke-tests the unauthenticated-redirect path, so this is a low-cost check, not a request to author new authenticated-flow e2e coverage) — add `npm run test:e2e` to WP02's Definition of Done and quickstart.md's validation commands, and drop the "not required" framing. |
| A2 | Charter Alignment / Coverage Gap | CRITICAL | plan.md (Charter Check: "Docs sync (DIR-002)"); tasks.md (no matching task) | plan.md's Charter Check states: "`MIGRATION_BACKLOG.md` item 4 and `NEXTSTEPS.md` gain an increment-ledger entry at mission completion" — this satisfies charter DIR-002 ("Keep documentation synchronized with workflow and behavior changes") and CLAUDE.md's high-complexity-spec policy ("Keep the increment ledger... in `NEXTSTEPS.md` so any session can resume"). No subtask in WP01 or WP02 performs this update, so it has zero task coverage and will likely be silently skipped during implementation. | Add a small subtask (e.g. WP02 T011, `execution_mode: planning_artifact`, or a standalone WP03) to: mark `MIGRATION_BACKLOG.md` item 4 done once WP02 lands (mirroring how Cluster 0's items were closed out), and add/update a `NEXTSTEPS.md` section for this mission per CLAUDE.md's increment-ledger convention. |
| A3 | Coverage Gap | HIGH | spec.md NFR-002; tasks/WP02-display-wiring.md (T010 "Risks" section explicitly names this as the highest risk); quickstart.md (SC-004 listed only under manual "Validate the UI" steps) | NFR-002 (status: Confirmed) requires unit-test coverage of "child-vs-parent isolation," one of five named combinations. As planned, WP01 T003 tests `computeEffectiveMaxStat` in isolation (a single flat array — the function has no concept of "whose" items it receives, so it structurally cannot test cross-character isolation), and WP02 T006 tests only that `loadChildInventories` doesn't mutate the pre-existing `inventory` ref — it does not test that `PlayerView.vue`'s `activeChildEquipment` computed reads from the correct `childInventories[child.id]` key rather than the parent's `inventory`. WP02's own "Risks" section names exactly this line as the single highest-risk point in the whole mission, yet no subtask assigns it an automated test — SC-004 is left to manual QA only. | Add a targeted subtask (extend T010, or add T011 before it) requiring a Vitest + `@vue/test-utils` test that mounts (or shallow-mounts) the relevant piece of `PlayerView.vue` — or, more simply, extracts `activeChildEquipment`'s logic into a small named, independently-testable function — and asserts it returns the child's own equipped items and never the parent's, given a populated `inventory` ref and a distinct `childInventories` entry for the active child. |
| A4 | Underspecification | MEDIUM | MIGRATION_BACKLOG.md:28 ("Mwasa's +4 Mana Ring"); tasks/WP01-schema-and-aggregation.md (T004) | T004 instructs the implementer to "find Mwasa's inventory entry... or the closest existing character with a ring/amulet-type item" and to possibly add a brand-new item if none exists. In fact the exact target already exists: `scripts/data/inventories.json`'s character `mwassa` ("Mwassa Mekhsitt" — the backlog's "Mwasa" is a spelling variant of the same character, confirmed via `characterId: "mwassa"`) already has an `armor[]` entry `{"itemId": "inv-9-anneau-de-mana", "name": "Anneau de Mana"}` with no mechanical fields at all — precisely the placeholder FR-008 wants populated. T004's hedged language ("or add one new entry") is unnecessary and risks the implementer creating a duplicate/second ring instead of completing the existing one. | Update T004 to name the exact target directly: `scripts/data/inventories.json`, `characterId: "mwassa"`, `armor[].itemId: "inv-9-anneau-de-mana"` — add `"equipped": true, "statBonus": { "stat": "maxMana", "amount": 4 }` to that existing entry. No new item, no search needed. |

### Coverage Summary Table

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 (equipped field) | Yes | T001 | Fully covered. |
| FR-002 (statBonus field) | Yes | T001 | Fully covered. |
| FR-003 (effective max formula) | Yes | T002, T003 | Fully covered. |
| FR-004 (render effective max on sheets) | Yes | T008, T009 | Fully covered. |
| FR-005 (child isolation) | Partial | T005–T007, T009, T010 | Implemented but under-tested — see A3. |
| FR-006 (unequip = pure recompute) | Yes | T002, T003 | Fully covered. |
| FR-007 (statNote untouched) | Yes | T002, T003 | Fully covered. |
| FR-008 (seed fixture) | Yes | T004 | Covered but underspecified — see A4. |
| NFR-001 (never throws / no-op safe) | Yes | T003, T005, T006 | Fully covered. |
| NFR-002 (test coverage of combinations) | Partial | T003, T006 | Isolation combination gap — see A3. |
| NFR-003 (CI gates green) | Partial | (implicit in both WPs' Definition of Done) | e2e gate omitted — see A1. |
| NFR-004 (French strings) | N/A | — | No new user-facing string introduced this mission; correctly not tasked. |

### Charter Alignment Issues

- **A1** — Quality Gates: `npm run test:e2e` requirement for full-view changes not reflected in plan.md or WP02.
- **A2** — Project Directive 2 (docs sync) and CLAUDE.md's increment-ledger mandate: promised in plan.md, not tasked.

### Unmapped Tasks

None — all 10 tasks (T001–T010) map to at least one FR via WP-level `requirement_refs` (WP01 → FR-001/002/003/006/007/008; WP02 → FR-004/005).

### Metrics

- Total Requirements (FR+NFR): 12
- Total Constraints: 6 (all honored by design, no violations found)
- Total Tasks: 10
- Coverage % (requirements with ≥1 task, excluding N/A): 100% nominal / 2 of 12 flagged partial (FR-005, NFR-002) pending A3
- Ambiguity Count: 0
- Duplication Count: 0
- Underspecification Count: 1 (A4)
- Charter Alignment Issues: 2 (A1, A2)
- Critical Issues Count: 2
