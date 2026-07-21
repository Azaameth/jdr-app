---
work_package_id: WP02
title: 'Display wiring: child inventory loading, parent + child effective-max rendering'
dependencies:
- WP01
requirement_refs:
- FR-004
- FR-005
tracker_refs: []
planning_base_branch: feat/equipment-stat-effects
merge_target_branch: feat/equipment-stat-effects
branch_strategy: Planning artifacts for this mission were generated on feat/equipment-stat-effects. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/equipment-stat-effects unless the human explicitly redirects the landing branch.
subtasks:
- T005
- T006
- T007
- T008
- T009
- T010
- T011
agent: ""
shell_pid: ""
history:
- timestamp: "2026-07-21T15:55:00Z"
  agent: "system"
  action: "Prompt generated via /spec-kitty.tasks"
agent_profile: frontend-freddy
authoritative_surface: src/components/vitruve/
create_intent:
- src/controllers/__tests__/useInventoryStore.spec.ts (extend if it exists, else create)
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/controllers/useInventoryStore.ts
- src/controllers/__tests__/useInventoryStore.spec.ts
- src/views/PlayerView.vue
- src/components/vitruve/VitruveSheet.vue
- src/components/vitruve/ChildSheetTab.vue
role: implementer
tags: []
---

# WP02 — Display wiring: child inventory loading, parent + child effective-max rendering

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load frontend-freddy
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Make the character sheet actually show the effect of equipped gear: the parent sheet (`VitruveSheet.vue`) and every child/transformation sheet (`ChildSheetTab.vue`) render `computeEffectiveMaxStat`'s output instead of the raw stored `maxHp`/`maxMana`, each strictly scoped to its own equipped items. This requires first closing a gap discovered during planning: **no code path today loads a child/transformation's own inventory** — `useInventoryStore` only ever holds one character's inventory at a time, always the parent's. You are adding that loading path, not just wiring up display.

**Prerequisite**: WP01 must be merged/green first (schema fields + `computeEffectiveMaxStat` must exist) — do not start this WP against a base that lacks them.

## Context (read these, in this order)

1. `kitty-specs/equipment-stat-effects-01KY2MYD/contracts/data-layer.md` — section 3 (store extension) and section 4 (exact consumption sites, with line numbers) are your spec for this WP.
2. `kitty-specs/equipment-stat-effects-01KY2MYD/data-model.md` — "Store extension" and "Derived value" sections — the exact shape of `childInventories` and the effective-max formula.
3. `kitty-specs/equipment-stat-effects-01KY2MYD/research.md` — D3 (the child-inventory gap: why a new cache, not a swap of the existing singleton ref) and D5 (why the `+`/`-` disabled-state clamping must also switch to the effective max).
4. `kitty-specs/equipment-stat-effects-01KY2MYD/spec.md` — Edge Cases section (current HP/Mana clamping against the new max; a child's own isolation from the parent's bonuses, SC-004).
5. Current code you're extending: `src/controllers/useInventoryStore.ts` (the whole file — you're adding a second cache alongside the existing `inventory` ref, not replacing anything), `src/views/PlayerView.vue` lines 62-71 (existing `inventoryStore`/`weapons`/`armor` computeds), lines 150-153 (`activeChild`), lines 588-605 (the `Promise.all` character-load sequence you're extending), lines 678-713 (`VitruveSheet` usage) and 788-797 (`ChildSheetTab` usage).

Branch strategy: planning base and merge target are both `feat/equipment-stat-effects`. Execution worktrees are allocated per computed lane from `lanes.json`; run `spec-kitty agent action implement WP02 --agent claude` and work in the workspace it reports. **Gotcha (from README):** worktrees don't share gitignored files — copy `.env` and run `npm install` in the worktree if needed.

## Subtasks

### T005 — Add `childInventories` cache + `loadChildInventories` to `useInventoryStore.ts`

**Purpose**: give the store a way to hold *multiple* characters' inventories at once, one per child, without disturbing the existing single-character `inventory` ref (FR-005's foundation).

In `src/controllers/useInventoryStore.ts`:

1. Add a second module-scope ref, alongside the existing `inventory`/`loading`/`error`:
   ```ts
   const childInventories = ref<Record<string, CharacterInventory>>({})
   ```
2. Add a new async function, following the existing functions' error-handling shape (though this one doesn't need a French `error.value` message on partial failure — a missing child inventory is a normal, expected case per data-model.md, not an error condition):
   ```ts
   async function loadChildInventories(childIds: string[], campaignId: string): Promise<void> {
     const results = await Promise.all(
       childIds.map((id) => getInventoryByCharacterId(id, campaignId)),
     )
     const next: Record<string, CharacterInventory> = {}
     childIds.forEach((id, i) => {
       const inv = results[i]
       if (inv) next[id] = inv
     })
     childInventories.value = next
   }
   ```
   Note `getInventoryByCharacterId` already has its own `if (!db) return null` guard (`InventoryRepository.ts:26`), so `loadChildInventories` is automatically a no-op-safe wrapper — an empty `childIds` array or a no-backend build both resolve to `childInventories.value = {}` without any extra guard needed here.
3. Add `childInventories: computed(() => childInventories.value)` and `loadChildInventories` to the factory's returned object, alongside the existing exports (`inventory`, `loading`, `error`, `loadInventory`, `saveBackpackItem`, `removeBackpackItem`, `saveEquipmentItem`, `removeEquipmentItem`, `freeSlots` — all unchanged).

**Do not** modify `loadInventory` or any existing function's behavior — the parent character's own inventory path must be byte-for-byte unchanged (the already-shipped backpack/weapons UI depends on it).

**Validation**: `npm run type-check` passes; existing store consumers (`PlayerView.vue`'s backpack/weapons tab) still work unchanged.

### T006 — Unit tests for `loadChildInventories`

**Purpose**: prove the new cache behaves correctly and safely (part of NFR-001's no-op-safe posture, extended to the new surface).

If `src/controllers/__tests__/useInventoryStore.spec.ts` already exists, add to it, following its existing repository-mocking pattern (mock `getInventoryByCharacterId` the same way the file already mocks the repository module — check for `vi.mock('../../models/repositories/InventoryRepository')` or similar at the top). If it doesn't exist yet, create it mirroring `src/models/repositories/__tests__/CharacterRepository.spec.ts`'s mocking structure (`vi.hoisted` mocks, `vi.resetModules()` + re-import per test).

Cover:
1. **No-db / empty `childIds`**: `loadChildInventories([], campaignId)` resolves, `childInventories.value` stays `{}`.
2. **Populates the cache**: given 2 child IDs where both have a `CharacterInventory`, `childInventories.value` has exactly those 2 entries, each keyed by the correct `characterId`.
3. **Missing inventory for one child**: given 2 child IDs where only 1 has a `CharacterInventory` doc (the mocked repository call returns `null` for the other), `childInventories.value` has exactly 1 entry — no `null`/`undefined` entry for the missing one.
4. **Does not touch the existing `inventory` ref**: calling `loadChildInventories` never changes `inventory.value` (call `loadInventory` first to set it to something, then call `loadChildInventories`, assert `inventory.value` is unchanged).
5. **Re-fetch replaces, doesn't merge**: calling `loadChildInventories` twice with different `childIds` lists results in `childInventories.value` reflecting only the second call's children — no stale entries from the first call linger.

**Validation**: `npm run test:unit -- useInventoryStore` green, all 5 cases present.

### T007 — Wire the load call into `PlayerView.vue`'s existing load sequence

**Purpose**: actually trigger the loading, at the point where the children list itself becomes known.

In `PlayerView.vue`, find the `Promise.all` around line 588-598 that already fetches `char`, `participantRow`, `inventoryStore.loadInventory(...)`, `raceList`, `classList`, and `childList` (via `listChildrenOf`). **After** that `Promise.all` resolves and `children.value` (or the local `childList` result) is available, call:

```ts
await inventoryStore.loadChildInventories(
  childList.map((c) => c.id),
  campaignId.value,
)
```

Place this call right after the existing `children.value = childList` assignment (or equivalent — check the exact variable name used for storing `childList` into reactive state; follow whatever pattern the surrounding code already uses for post-`Promise.all` assignment). This can run either inside the same `try` block as a sequential `await` after the `Promise.all`, or added as a 7th parallel entry in the `Promise.all` itself if `campaignId.value` is already stable at that point — prefer keeping it sequential-after unless you confirm the parallel form doesn't introduce a race with `children.value` not yet being set (the function only needs the raw `childList` array, not the reactive `children.value`, so a parallel entry is safe too — your call).

**Do not** add any lazy/on-tab-switch loading — children are loaded eagerly here, same as everything else in this sequence (research.md D3's rationale: `childSessions` are already all loaded upfront, so this matches existing precedent).

**Important — existing test fixture needs updating too**: `src/views/__tests__/PlayerView.spec.ts` already mocks `useInventoryStore` via a `makeInventoryStore(inventory)` helper (around line 93) that every existing test in the file uses through `mockInventoryState.mockReturnValue(makeInventoryStore(...))`. Once `PlayerView.vue` calls `inventoryStore.loadChildInventories(...)` (this subtask), every existing mounted-`PlayerView` test will throw `TypeError: inventoryStore.loadChildInventories is not a function` unless the mock is updated first. Extend `makeInventoryStore` to also return:
```ts
childInventories: computed(() => childInventoriesMap ?? {}),
loadChildInventories: vi.fn<() => Promise<void>>(async () => {}),
```
(add an optional second parameter to `makeInventoryStore` for the child-inventories map, defaulting to `{}`, so every pre-existing call site — which passes only one argument — keeps working unchanged). Do this as part of this subtask, not deferred to T011, since T007 is what breaks the fixture.

**Validation**: `npm run dev`, load a character with at least one child/transformation (Firm/Furmiaou in seed data), confirm no console errors and no change in load time perceptible to a human. `npm run test:unit -- PlayerView` still green (every pre-existing test in the file, not just new ones).

### T008 — `VitruveSheet.vue`: render effective max HP/Mana, fix clamping

**Purpose**: the parent sheet shows the real, equipment-adjusted max (FR-004, SC-001, SC-002, SC-003, SC-005).

`VitruveSheet.vue` currently has **no inventory-related prop at all** — it only knows about `character`, `participant`, `raceName`, `className`, `canEditSession`, `sessionLoading`, `sessionError`. You need to:

1. Add a new prop to accept the parent's weapon/armor list:
   ```ts
   const props = withDefaults(
     defineProps<{
       // ...existing props unchanged...
       equipment?: WeaponArmorItem[]
     }>(),
     {
       // ...existing defaults unchanged...
       equipment: () => [],
     },
   )
   ```
   Import `WeaponArmorItem` from `'../../models/types/Inventory'`. (A single combined `equipment` prop is simpler than two separate `weapons`/`armor` props here, since `computeEffectiveMaxStat` doesn't care which list an item came from — it just filters by `equipped`/`statBonus.stat`. If you prefer to mirror `PlayerView.vue`'s existing `weapons`/`armor` split for consistency, that's also acceptable — just be consistent with what you do in T010.)
2. Import `computeEffectiveMaxStat` from `'../../utils/effectiveStats'`.
3. Add computed properties for the effective maxes:
   ```ts
   const effectiveMaxHp = computed(() => {
     const s = session.value
     if (!s) return 0
     return computeEffectiveMaxStat(s.maxHp, props.equipment, 'maxHp')
   })
   const effectiveMaxMana = computed(() => {
     const s = session.value
     if (!s) return 0
     return computeEffectiveMaxStat(s.maxMana, props.equipment, 'maxMana')
   })
   ```
4. In the template, replace `{{ session.maxHp }}` (line ~95) with `{{ effectiveMaxHp }}` and `{{ session.maxMana }}` (line ~120) with `{{ effectiveMaxMana }}`.
5. **Fix clamping** (research.md D5): update `hpMinusDisabled`/`hpPlusDisabled`/`manaMinusDisabled`/`manaPlusDisabled` (lines 41-60) to compare against `effectiveMaxHp.value`/`effectiveMaxMana.value` instead of `s.maxHp`/`s.maxMana`. Example for one:
   ```ts
   const hpPlusDisabled = computed(() => {
     const s = session.value
     if (!s) return true
     return props.sessionLoading !== null || s.hp >= effectiveMaxHp.value
   })
   ```
   Apply the same substitution to all four disabled-computeds — `hpMinusDisabled` compares against `-effectiveMaxHp.value`, `manaPlusDisabled` against `effectiveMaxMana.value`. `manaMinusDisabled` (`s.mana <= 0`) does not reference a max at all and is unchanged.

**Validation**: with no `equipment` prop passed (or an empty array), `effectiveMaxHp`/`effectiveMaxMana` equal the raw stored values — zero visible change from today (edge case in spec.md: "no equipped items ⇒ displays exactly their stored base max, unchanged").

### T009 — `ChildSheetTab.vue`: accept the child's own equipment, render its own effective max, fix clamping

**Purpose**: the same fix as T008, but for a transformation/child, strictly isolated to its own items (FR-004, FR-005, SC-004).

1. Add a new prop, same shape as T008's `VitruveSheet.vue` choice (stay consistent — if you used a combined `equipment` prop there, use the same name/shape here):
   ```ts
   const props = defineProps<{
     child: CharacterProfile
     childSession: CharacterSessionState | null
     canEdit: boolean
     equipment?: WeaponArmorItem[]
   }>()
   ```
   (Vue's `defineProps` requires a default for optional array props even without `withDefaults` if you destructure — check how the existing `VitruveSheet.vue` `withDefaults` pattern handles this and mirror it, or default inline in the computed: `props.equipment ?? []`.)
2. Import `computeEffectiveMaxStat` and `WeaponArmorItem` the same way as T008.
3. Add `effectiveMaxHp`/`effectiveMaxMana` computeds using `session.value.maxHp`/`session.value.maxMana` (the existing `session` computed at line 47, which already falls back to `FALLBACK_SESSION` when `childSession` is null) as the base, and `props.equipment ?? []` as the items list.
4. In the template, replace `{{ session.maxHp }}` (line ~135) and `{{ session.maxMana }}` (line ~160) with the two new computeds.
5. **Fix clamping**: update `hpMinusDisabled`/`hpPlusDisabled` (lines 104-105) to compare against `effectiveMaxHp.value` instead of `session.value.maxHp`.
6. **Fix the mana-visibility check**: `hasMana` (line 107) currently reads `session.value.maxMana > 0` to decide whether to show "Aucune magie" — this must also switch to `effectiveMaxMana.value > 0`, otherwise a child with a base `maxMana` of 0 but an equipped mana-bonus item would still incorrectly show "Aucune magie" instead of its newly-nonzero effective mana.

**Isolation is the critical invariant here (SC-004)**: this component must only ever receive *this child's own* equipment via the prop — never fall back to or merge in the parent's equipment. You are not responsible for enforcing that at the call site in this subtask (that's T010), but do not write any code here that reaches outside `props` to find equipment (e.g. do not import `useInventoryStore` directly into this component and read `.inventory` — that would silently grab the *parent's* singleton ref instead of the child's, exactly the isolation bug research.md D3/data-model.md warns about).

**Validation**: with `equipment` omitted or empty, behavior is pixel-identical to today.

### T010 — `PlayerView.vue`: pass the right equipment to each sheet

**Purpose**: connect T005-T007's data to T008/T009's props — the parent sheet gets the parent's own weapons+armor, each child sheet gets that child's own weapons+armor from the new `childInventories` cache.

1. Parent sheet (around line 678-713): add the new prop to the existing `<VitruveSheet>` usage, e.g.:
   ```html
   <VitruveSheet
     ...
     :equipment="[...weapons, ...armor]"
     ...
   >
   ```
   using the existing `weapons`/`armor` computeds already defined at lines 69-70 (do not create new computeds for this — they already exist and are already correctly scoped to the parent).
2. Child sheet (around line 788-797): add a new computed sourcing from the child cache, scoped to `activeChild`:
   ```ts
   const activeChildEquipment = computed<WeaponArmorItem[]>(() => {
     const child = activeChild.value
     if (!child) return []
     const inv = inventoryStore.childInventories.value[child.id]
     if (!inv) return []
     return [...inv.weapons, ...inv.armor]
   })
   ```
   and pass it down:
   ```html
   <ChildSheetTab
     :child="activeChild"
     :child-session="participant?.childSessions?.[activeChild.id] ?? null"
     :can-edit="canEditCharacter"
     :equipment="activeChildEquipment"
     @adjust-hp="handleChildAdjustHp"
     @set-injury="handleChildSetInjury"
   />
   ```

**This is the isolation-critical wiring (SC-004)**: `activeChildEquipment` must read from `inventoryStore.childInventories.value[child.id]`, never from `inventoryStore.inventory.value` (that's the parent's). Double-check this line specifically before marking the subtask done — it's the one line where a copy-paste mistake would silently break the isolation invariant with no type error to catch it (both are `CharacterInventory | null`).

**Validation**: manual check per `quickstart.md`'s "Validate the UI" section — a character with an equipped bonus item shows the raised max (SC-001); a transformation tab shows a *different* effective max than the parent when only one of them has bonus gear equipped (SC-004).

### T011 — Automated isolation regression test (closes analyze finding A3)

**Purpose**: `/spec-kitty.analyze` flagged that SC-004/FR-005's child-vs-parent isolation invariant — which T010's own risk note calls the single highest-risk line in this WP — had no automated test at the layer where it could actually break. T006 only proves the store cache is populated correctly; it doesn't prove `PlayerView.vue` reads from the right key. This subtask closes that gap.

Add to the existing `describe('PlayerView — child character tabs & raw editor (WP06)', ...)` block in `src/views/__tests__/PlayerView.spec.ts` (around line 609 — reuse its `furmiaou` fixture and `mountAsOwner()` helper, do not duplicate them):

1. In `mountAsOwner()` (or a local variant for this test), pass distinct equipment to the parent vs. the child through the T007-extended `makeInventoryStore(parentInventory, childInventoriesMap)`:
   ```ts
   const parentInventory = makeInventory({
     uid: 'owner-uid',
     armor: [
       { itemId: 'parent-ring', name: 'Anneau du Parent', equipped: true, statBonus: { stat: 'maxMana', amount: 4 } },
     ],
   })
   const childInventory = makeInventory({
     id: 'inv-furmiaou',
     characterId: 'furmiaou',
     armor: [
       { itemId: 'child-ring', name: 'Griffe Enchantée', equipped: true, statBonus: { stat: 'maxHp', amount: 10 } },
     ],
   })
   mockInventoryState.mockReturnValue(
     makeInventoryStore(parentInventory, { furmiaou: childInventory }),
   )
   ```
2. Mount `PlayerView`, switch to the `Furmiaou` tab (reuse the `selectTab` helper already used elsewhere in this file), and assert on `ChildSheetTab`'s received `equipment` prop (the prop name/shape from T009):
   ```ts
   const childTab = wrapper.findComponent(ChildSheetTab)
   const equipment = childTab.props('equipment') as WeaponArmorItem[]
   expect(equipment).toEqual(childInventory.armor)          // has the child's own item
   expect(equipment.some((i) => i.itemId === 'parent-ring')).toBe(false)  // never the parent's
   ```
3. Add the inverse assertion on the parent side (switch back to a base tab, or check `VitruveSheet`'s `equipment` prop while still on a base tab before switching): the parent's `VitruveSheet` equipment must never include `'child-ring'`.

**Validation**: this test fails if `PlayerView.vue`'s `activeChildEquipment` computed (T010) is ever changed to read `inventoryStore.inventory.value` instead of `inventoryStore.childInventories.value[child.id]` — that's the whole point; if you can comment out the `.value[child.id]` indexing and the test still passes, the test isn't strict enough.

## Definition of Done

- [ ] `useInventoryStore` exposes `childInventories`/`loadChildInventories` per `contracts/data-layer.md` section 3, without changing any existing export's behavior.
- [ ] All 5 test cases in T006 present and passing.
- [ ] `PlayerView.vue` loads child inventories eagerly alongside the existing character-load sequence.
- [ ] `VitruveSheet.vue` and `ChildSheetTab.vue` both render `computeEffectiveMaxStat`'s output, not the raw stored max.
- [ ] Both components' `+`/`-` disabled-state clamping uses the effective max, not the raw stored max.
- [ ] `ChildSheetTab.vue`'s `hasMana`/"Aucune magie" check uses the effective max.
- [ ] `PlayerView.vue` passes the parent's own equipment to `VitruveSheet` and each child's own equipment (from `childInventories`, never `inventory`) to `ChildSheetTab`.
- [ ] With no equipped bonus items anywhere, the UI is pixel-identical to before this WP (regression check).
- [ ] T011's isolation test exists, passes, and is strict enough to fail if the isolation wiring regresses (see T011's validation note).
- [ ] `npm run type-check`, `npm run lint`, `npm run test:unit`, and `npm run test:e2e` all green (the e2e gate applies because this WP modifies `PlayerView.vue`, a full view — charter Quality Gates; existing `e2e/vitruve.spec.ts` is smoke-level, so this is a regression check, not new e2e authoring — analyze finding A1).

## Risks

- **Isolation bug** (highest risk, called out in T010 — now covered by T011): `activeChildEquipment` accidentally reading the parent's `inventory` ref instead of `childInventories[child.id]` would compile fine (same type) and only show up as a behavioral bug — a child incorrectly inheriting the parent's bonuses, or vice versa. T011 makes this a CI-caught failure, not just a manual-QA hope.
- **Clamping regression**: forgetting to update even one of the four `VitruveSheet.vue` disabled-computeds (or the two `ChildSheetTab.vue` ones) leaves a stale comparison against the raw max — subtle, since it only misbehaves once a character actually has equipment bonuses in play (the seed fixture from WP01 T004 makes this testable).
- **Prop-shape drift between the two components**: T008 and T009 must use the same `equipment` prop shape, or T010's wiring code becomes inconsistent. Decide the shape once (combined `equipment: WeaponArmorItem[]` is recommended) and use it in both.
- **Broken existing test fixture**: T007's extension of `makeInventoryStore` must keep every pre-existing call site (single-argument) working — if the second parameter isn't optional-with-a-default, every test in `PlayerView.spec.ts` written before this WP breaks.

## Reviewer Guidance

- Trace `activeChildEquipment` in `PlayerView.vue` back to `childInventories`, not `inventory` — this is the single highest-value line to review carefully. T011 should fail if this is wrong; verify T011 actually would fail by briefly checking its assertion targets the right prop.
- Verify all four `VitruveSheet.vue` clamping computeds and both `ChildSheetTab.vue` ones were updated — grep for `s.maxHp`/`s.maxMana`/`session.value.maxHp`/`session.value.maxMana` remaining in disabled-state logic after the change; there should be none left comparing against the raw value.
- Confirm `hasMana` in `ChildSheetTab.vue` uses the effective max — easy to miss since it's not a `+`/`-` button.
- Manually exercise SC-004: seed or raw-edit one bonus item onto a child only (not the parent), confirm the parent's displayed max is unaffected and only the child's is raised.
- Confirm zero changes to `src/models/types/Inventory.ts`, `src/utils/effectiveStats.ts`, or `scripts/data/inventories.json` in this WP's diff — those are WP01's surface.
- Confirm `npm run test:e2e` was actually run (not skipped) — check the activity log / PR notes for its output, not just `test:unit`.

## Activity Log

- 2026-07-21T15:55:00Z – system – Prompt generated via /spec-kitty.tasks
