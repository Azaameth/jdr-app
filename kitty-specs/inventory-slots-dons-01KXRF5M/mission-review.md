# Mission Review Report: inventory-slots-dons-01KXRF5M

**Reviewer**: Claude (Fable 5), post-merge mission review — `spec-kitty-mission-review` skill
**Date**: 2026-07-18
**Mission**: `inventory-slots-dons-01KXRF5M` — Inventory Slots & Dons System
**Baseline commit**: `4c77bbc0146e9adfbe2a6eec93ffd1fa4a52366d`
**HEAD at review**: `2d1fe2bfbfa42406f92133f7773b7e3199534ec8`
**WPs reviewed**: WP01–WP05 (all `done`; squash merge `0842f22` onto `feat/inventory-slots-dons`)

---

## Gate Results

The skill's four hard gates were written for the spec-kitty repository itself
(contract/architectural suites, cross-repo e2e harness). This application repo
has none of that infrastructure — the `pre_review_gate` entries in
`status.events.jsonl` confirm it (`No module named 'tests'`, `outcome:
no_coverage` on every WP). Gates 1–3 are therefore recorded N/A with the
project's real CI gates run as the equivalent enforcement surface. Gate 4's
artifact **is** a live convention in this project and is evaluated as written.

### Gate 1 — Contract tests
- Command: N/A (`tests/contract/` does not exist in jdr-app)
- Equivalent run: manual line-by-line conformance check of
  `contracts/data-layer.md` against the shipped exports.
- Result: **PASS (equivalent)** — every locked name and signature matches:
  `parseWeaponArmorText` / `formatWeaponArmorStat` / `parseQuantityText` /
  `parseLegacyGiftText` (`src/utils/inventoryText.ts`), `InventoryCategory` /
  `BACKPACK_MAX_SLOTS` / `InventoryItem` / `WeaponArmorItem` /
  `CharacterInventory` (`src/models/types/Inventory.ts`),
  `updateInventoryItems` / `updateInventoryEquipment` with `if (!db) return
  false` guards and `updatedAt` refresh (`InventoryRepository.ts`), and the
  full `useInventoryStore` surface including the French-fallback catch shape.

### Gate 2 — Architectural tests
- Command: N/A (`tests/architectural/` does not exist)
- Equivalent run: `npm run type-check` (exit 0, clean) + `npm run lint`
  (oxlint + eslint `--fix`, exit 0, zero autofix residue in `git status`) +
  layering check: components/views import only `useInventoryStore`, never
  `InventoryRepository` (grep over the diff: PlayerView.vue imports the store
  at line 14; no repository import appears in any `.vue` file).
- Result: **PASS (equivalent)**

### Gate 3 — Cross-repo E2E
- Command: N/A (no `spec-kitty-end-to-end-testing` repo in this project)
- Equivalent run: `CI=1 npx playwright test --project=chromium` → **3/3
  passed** (castes, inventory, vue root). A first non-CI run failed 3/3 with
  `Missing X server or $DISPLAY` — purely environmental (headless SSH box;
  `playwright.config.ts:43` only forces headless under `CI`), not a code
  defect; the pre-existing `vue.spec.ts` failed identically.
- Result: **PASS (equivalent)**

### Gate 4 — Issue Matrix
- File: `kitty-specs/inventory-slots-dons-01KXRF5M/issue-matrix.md`
- Result: **FAIL — artifact absent.** Both prior missions ship one
  (`kitty-specs/faction-caste-browser-01KXBRY3/issue-matrix.md`,
  `kitty-specs/wire-up-the-dice-roller-01KXDN1H/issue-matrix.md`) using
  exactly the verdict vocabulary this gate checks, so the convention is live
  in this project and this mission deviates from it.
- Mitigation evidence: the *substance* the matrix would carry is fully
  documented elsewhere with terminal dispositions — the WP03 cycle-1 blocker
  (missing PlayerView-level integration tests) is `fixed` (commit `c51d418`,
  verified in the cycle-2 approval event), and WP05's three non-blocking
  follow-ups (Dons `h2` heading not literally asserted; stale
  `legacy-reference/README.md:21` entry; missing e2e auth fixture) are
  recorded with rationale in the WP05 approval event
  (`status.events.jsonl:35`). Nothing is silently deferred; the canonical
  artifact is just missing.
- Remediation: author `issue-matrix.md` retroactively from those four rows
  (1× `fixed`, 3× `deferred-with-followup`) — a documentation-only change.
- **Addendum (2026-07-18, post-review)**: remediation executed on operator
  go-ahead — `issue-matrix.md` authored with the four rows above, transcribed
  from the event log. Gate 4 now conforms; the FAIL above records the state
  at review time.

---

## FR Coverage Matrix

| FR ID | Description (brief) | WP Owner | Test File(s) | Test Adequacy | Finding |
|-------|---------------------|----------|--------------|---------------|---------|
| FR-001 | 10 fixed categories, hard caps | WP01/WP02 | `BackpackGrid.spec.ts` (all 10 French labels + counts), `useInventoryStore.spec.ts` (cap rejection) | ADEQUATE | Caps in `Inventory.ts:13-24` independently re-verified against `legacy-reference/index.html:3168-3186` — exact match |
| FR-002 | Empty slots computed, never stored | WP01/WP02 | `BackpackGrid.spec.ts` (soins 1→14 empty), `useInventoryStore.spec.ts` (`freeSlots`) | ADEQUATE | Fixtures contain no empty-slot records (verified by inspection) |
| FR-003 | Slot add/edit/delete, persisted | WP01/WP03 | `InventoryRepository.spec.ts`, `useInventoryStore.spec.ts`, `PlayerView.spec.ts` (5 integration cases from cycle 2) | ADEQUATE | Integration path (slot click → modal → store → close/stay-open) covered after the WP03 rejection cycle |
| FR-004 | Weapons/armor separate, uncapped, badges, pad-to-3 | WP01/WP02 | `WeaponArmorList.spec.ts` | ADEQUATE | — |
| FR-005 | Lossless annotation conversion | WP01 | `inventoryText.spec.ts` (full corpus incl. `(D4/−1)` Unicode minus, `(RD2 vs proj. magiques)`, `(vs proj. magiques)`, `(Armure impossible — Oracle)`) | ADEQUATE | Fall-through to `statNote` verbatim confirmed in code (`inventoryText.ts:56`) |
| FR-006 | Enriched don + detail modal tiles | WP01/WP04 | `DonDetailModal.spec.ts`, `DonList.spec.ts` | ADEQUATE | `white-space: pre-line` description verified |
| FR-007 | Legacy `DONS_DATA` persisted via fixtures | WP01 | Migration determinism (re-run: zero diff) + WP01 review byte-for-byte check vs `index.html:3305-3348` | ADEQUATE | `DONS_DATA` transcribed in `migrateInventoryFixtures.mjs:163` |
| FR-008 | Seed fixtures migrated to typed shapes | WP01 | Re-ran `node scripts/migrateInventoryFixtures.mjs` during this review → `git status` clean (deterministic) | ADEQUATE | 5 inventories, 100% of items categorized, weapons/armor split, gifts enriched (verified programmatically) |
| FR-009 | Edit only owner / mj / admin | WP03 | `PlayerView.spec.ts` (DIV vs BUTTON per role, mismatched-uid, no-backend) | ADEQUATE | Client gate `PlayerView.vue:62-68` + server-side `firestore.rules:121-127` (owner-or-mj/admin, unchanged per C-005) |
| FR-010 | Passives: "—" tiles, no fake zeros | WP04 | `DonDetailModal.spec.ts`, `DonList.spec.ts` | ADEQUATE | `damageBonus === 0` treated as absent (`DonDetailModal.vue:47-48`), matching legacy `bonus && bonus !== 0` |

**NFRs**: NFR-001 (no-backend degradation) — `if (!db)` guards on all three
repository functions + no-secrets e2e smoke green: **met**. NFR-002
(losslessness) — corpus tests + deterministic migration: **met**. NFR-003
(gates green) — all four re-run by this review at HEAD: **met**. NFR-004
(French strings) — all new user-facing strings French, tone-consistent: **met**.

**Constraints**: C-001/C-002/C-003 locked schema — conformant. C-004 — dead
`InventoryItem`/`InventoryItemType` really gone from `Character.ts`
(re-verified). C-005 — no `firestore.rules` diff. C-006 — WP01 landed green
before any UI WP (event log timestamps confirm). C-007 — no Vitruve-shell or
alt-form code in the diff; legacy `equip` not migrated; the retained
`equipped?: boolean` on `InventoryItem` is sanctioned by `data-model.md:30`
("kept for compatibility with existing docs") and absent from the regenerated
fixtures — not drift.

---

## Drift Findings

None. No non-goal invasion, no locked-decision violation, no punted FR (all
10 FRs trace to live assertions), no NFR miss.

---

## Risk Findings

### RISK-1: Category-cap bypass on a category-changing edit
**Type**: BOUNDARY-CONDITION · **Severity**: LOW
**Location**: `src/controllers/useInventoryStore.ts:53-61`
**Trigger condition**: `saveBackpackItem` called with an existing `itemId` and
a `category` different from the stored item's; the cap check runs only when
`isNew`, so the edit lands in the target category even at cap.
**Analysis**: Unreachable through the shipped UI — `InventorySlotModal.vue`
pins `category` from the slot context (`ctx.category`) and offers no category
picker, so edits cannot move categories today. The hazard is latent for the
upcoming Vitruve sheet or any future caller that allows recategorizing. Cheap
hardening: run the cap check whenever the target category's filled count
(excluding the item itself) is at max, not only for new items.

### RISK-2: Contract-mandated parser exports with no production caller
**Type**: DEAD-CODE · **Severity**: LOW
**Location**: `src/utils/inventoryText.ts:86-93` (`parseQuantityText`),
`:101-148` (`parseLegacyGiftText`)
**Trigger condition**: n/a (structural)
**Analysis**: Both are exported per `contracts/data-layer.md` and corpus-tested,
but no `src/` caller outside tests exists — quantities and gifts are fully
structured post-migration, so runtime parsing isn't needed.
`scripts/migrateInventoryFixtures.mjs` deliberately *re-implements* the same
rules (documented at its header: "keep the two in sync if either changes")
because a plain `.mjs` script can't import TS. Two hand-synced parser
implementations are a drift hazard; the `.mjs` copy has no unit tests of its
own (its guard is the determinism check). Acceptable at hobby scale since the
migration is one-shot, but if the parser evolves for the Vitruve sheet, the
duplication should be collapsed or the dead exports retired.

### RISK-3: Last-write-wins on concurrent inventory edits
**Type**: CROSS-WP-INTEGRATION · **Severity**: LOW (accepted design)
**Location**: `src/models/repositories/InventoryRepository.ts:38-58`
**Trigger condition**: player and MJ edit the same inventory concurrently.
**Analysis**: Both write functions replace the whole array (`updateDoc` with
the full list built from the store's in-memory state), so the slower writer
silently clobbers the faster one, and neither client re-reads. This is the
contract's *locked* design ("Whole-array replacement … keeps the repository
dumb"), so it is not drift — recorded here because the spec never states the
single-concurrent-editor assumption it rests on. At a 5-player table the
window is negligible.

### RISK-4: E2E proves only the auth-guard redirect
**Type**: TEST-SCOPE · **Severity**: INFO (documented deviation)
**Location**: `e2e/inventory.spec.ts`
**Analysis**: With no auth fixture in the repo, PlayerView content is
unreachable end-to-end; the spec file itself documents this thoroughly and the
WP05 reviewer ruled the deviation correct, with the structural assertions
carried at component level. Matches the `castes.spec.ts` precedent and
faction-caste-browser's ISSUE-4. The standing follow-up (build an e2e auth
fixture) is now flagged by two consecutive missions — it is aging.

### Process note: implementer/review-claim identity overlap on WP04/WP05
Both WPs were implemented by actor `claude` and their review *claims* were
also actor `claude` (`status.events.jsonl:26-29, 31-34`); the approval
*verdicts* were recorded by the human operator (`emonthieux`), so reviewer
independence held where it matters. No `ReviewerSelfApproval` events exist.
Worth keeping distinct agent identities on claim events for cleaner audit
trails.

---

## Silent Failure Candidates

| Location | Condition | Silent result | Spec impact |
|----------|-----------|---------------|-------------|
| `InventoryRepository.ts:42,54` | `db` unset | `return false` | Intended NFR-001 degradation; store converts to a visible French error |
| `inventoryText.ts:82` (`formatWeaponArmorStat`) | item has no stats | `''` | Intended — `WeaponArmorList.vue` omits the badge; spec-conform |
| `InventoryRepository.ts:14-16` (`mapInventory`) | non-array `items`/`weapons`/`armor` | defaults `[]` | Committed repo convention; could mask a malformed doc, but matches every other repository |

No `catch`-and-swallow paths: every store catch sets `error.value` and returns
`false`, and PlayerView keeps the modal open on failure so the error is seen.

---

## Security Notes

| Finding | Location | Risk class | Recommendation |
|---------|----------|------------|----------------|
| No findings | — | — | — |

Sweep results: no subprocess/network code beyond the Firestore SDK; no
`v-html`/`innerHTML` in any new component; no `@ts-ignore`/`eslint-disable`
suppressions added anywhere in the mission diff; fixtures contain game data
only, no secrets; `firestore.rules` untouched and already enforcing FR-009
server-side (`resource.data.uid == request.auth.uid || isMjOrAdmin()`);
`crypto.randomUUID()` requires a secure context — satisfied on GitHub Pages
(HTTPS) and localhost.

---

## Final Verdict

**PASS WITH NOTES**

### Verdict rationale

All 10 FRs trace spec → WP → live test → code with no broken link; the locked
data-layer contract shipped signature-exact; no locked decision or non-goal
was violated; all four project quality gates were re-run at HEAD by this
review and are green (type-check clean, lint clean, 197/197 unit, 3/3 e2e
chromium under CI conditions); the fixture migration was re-executed and is
deterministic; security sweep clean. The single gate nonconformance is Gate 4:
`issue-matrix.md` is absent despite being a 2-for-2 convention in this
project. A strict reading of the gate would force FAIL, but every candidate
row already has a documented terminal disposition with evidence in
`status.events.jsonl` (1 fixed with a verified commit, 3 deferred with
recorded rationale), so the deficiency is the artifact, not the delivery. No
CRITICAL or HIGH finding exists.

### Open items (non-blocking)

1. Author `kitty-specs/inventory-slots-dons-01KXRF5M/issue-matrix.md`
   retroactively (rows enumerated under Gate 4) to close the gate cleanly.
2. Harden `saveBackpackItem` cap check for category-changing edits before the
   Vitruve sheet adds new store callers (RISK-1).
3. Decide the fate of the dead parser exports / duplicated `.mjs` parser when
   the parser next changes (RISK-2).
4. Build the e2e auth fixture — now deferred by two consecutive missions
   (RISK-4); it would unlock content-level smoke for player and castes routes.
5. `legacy-reference/README.md:21` still lists the inventory feature as
   unported (WP05 follow-up 2).

## Retrospective Reminder

The retrospective record was authored automatically at the runtime terminus:
`kitty-specs/inventory-slots-dons-01KXRF5M/retrospective.yaml` exists
(`RetrospectiveCaptured` event `01KXS4B9SF80MZ8PQZEEDK7TDA`,
`findings_status: has_findings`, committed in `bd52c4d`) — no `retrospect
create` needed. To surface findings while the work is fresh:

- `spec-kitty retrospect summary` — cross-mission aggregation (read-only)
- `spec-kitty agent retrospect synthesize --mission inventory-slots-dons-01KXRF5M` — inspect proposals (dry-run)
- add `--apply` only when you intend to apply staged proposals (mutates)
