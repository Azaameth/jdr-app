---
work_package_id: WP02
title: Backpack & equipment display
dependencies:
- WP01
requirement_refs:
- FR-001
- FR-002
- FR-004
tracker_refs: []
planning_base_branch: feat/inventory-slots-dons
merge_target_branch: feat/inventory-slots-dons
branch_strategy: Planning artifacts for this mission were generated on feat/inventory-slots-dons. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/inventory-slots-dons unless the human explicitly redirects the landing branch.
subtasks:
- T008
- T009
- T010
- T011
- T012
agent: "claude:sonnet:reviewer-renata:reviewer"
shell_pid: "33053"
history:
- 2026-07-17T16:47:51Z — created by /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: src/views/
create_intent:
- src/components/BackpackGrid.vue
- src/components/WeaponArmorList.vue
- src/components/__tests__/BackpackGrid.spec.ts
- src/components/__tests__/WeaponArmorList.spec.ts
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/views/PlayerView.vue
role: implementer
tags: []
---

# WP02 — Backpack & equipment display

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load frontend-freddy
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Replace `PlayerView.vue`'s flat inventory list with read-only rendering of the categorized backpack (10 categories, filled items + computed empty placeholders) and separate armes/armures sections with DÉGÂTS/ARMURE badges, consuming `useInventoryStore` (never repositories directly). No editing yet.

## Context

- `contracts/data-layer.md` — store API + component naming (locked by WP01, merged).
- `data-model.md` — `BACKPACK_MAX_SLOTS`, category list, badge semantics.
- Legacy visual reference: `legacy-reference/index.html:3106-3186` (slot grid, empty-slot style, category labels/order/columns) and `3118-3144` (statCard badges, pad-to-3). Informational fidelity is contractual; exact colors/fonts may adapt to the app's existing look (see `FactionBrowserView.vue` / `CosmologyView.vue` for the app's card style).
- French labels from legacy: "Nourriture — 1 emplacement", "Munitions — 2 emplacements", "Matériel de bivouac & camp", "Matériel de soins", "Potions, Poisons, Antidotes", "Objets de quête", "Objets spéciaux & Reliques", "Documents, Livres, Titres", "Gemmes & Pierres précieuses", "Butin à revendre (ou pas)".

Branch strategy: planning base and merge target are `feat/inventory-slots-dons`; run `spec-kitty agent action implement WP02 --agent claude` and work in the lane worktree it reports (worktrees don't share gitignored files — copy `.env`, `npm install`).

## Subtasks

### T008 — `src/components/BackpackGrid.vue`

Props: `items: InventoryItem[]` (backpack only). Render the 10 categories in legacy order/layout groupings (nourriture+munitions row, then bivouac/soins/potions full-width, quete+speciaux, docs+gemmes, butin). Per category: header `"<label> — <max> emplacements"`, CSS grid of filled slots (name + `×N` only when quantity > 1) followed by `BACKPACK_MAX_SLOTS[cat] − filled` empty placeholder slots (dashed border, muted). Emit `slot-click` with `{ category, item? }` (unused until WP03, wire now for stability). Keyboard-accessible slots (`button` elements, not click-only divs).

### T009 — `src/components/WeaponArmorList.vue`

Props: `title: string`, `kind: 'weapons' | 'armor'`, `items: WeaponArmorItem[]`. Each entry: name + right-hand badge — label `DÉGÂTS` (weapons) / `ARMURE` (armor), value from `formatWeaponArmorStat(item)`; omit the badge when the value is `''`. Pad to a minimum of 3 slots with empty placeholders. Emit `slot-click` `{ kind, item? }`.

### T010 — Integrate into `PlayerView.vue`

Replace the current flat inventory `<section>` (`PlayerView.vue:515-524`) with: armes/armures sections (two `WeaponArmorList`) + `BackpackGrid`. Load via `useInventoryStore().loadInventory(...)` in the existing `loadCharacter()` `Promise.all`, replacing the direct `getInventoryByCharacterId` call and the local `inventory` ref. Keep the dons section untouched (WP04's surface).

### T011 — Component tests

`BackpackGrid.spec.ts`: correct filled/empty counts per category (e.g. 1 soins item → 14 empty), quantity display rules, category labels present. `WeaponArmorList.spec.ts`: badge text for structured stats and statNote, badge omitted when empty, pad-to-3 with 0/1/4 items. Follow `CosmologyTierCard.spec.ts` mounting style.

### T012 — Degradation check

With no Firebase config the store returns null inventory: sections must render gracefully (empty backpack showing all placeholders is acceptable, or hide sections when inventory is null — match how PlayerView handles null participant today). Verify `npm run build` (no secrets) + preview shows no console errors.

## Definition of Done

- [ ] Backpack renders all 10 categories with exact slot math; weapons/armor badges match `formatWeaponArmorStat`.
- [ ] PlayerView consumes only the store; local direct-repository call removed.
- [ ] Component tests green; `type-check`/`lint`/`test:unit` green; no-backend render clean.
- [ ] No editing UI introduced; dons section untouched.

## Reviewer Guidance

- Count slots in the rendered output for a seeded character against `BACKPACK_MAX_SLOTS` — off-by-one in empty-slot math is the likely bug.
- Confirm store-only data access (grep the diff for `InventoryRepository` imports in view/components — should be none).
- Check French labels against the legacy list verbatim.

## Activity Log

- 2026-07-17T18:05:47Z – claude:sonnet:frontend-freddy:implementer – shell_pid=31501 – Assigned agent via action command
- 2026-07-17T18:13:44Z – claude:sonnet:frontend-freddy:implementer – shell_pid=31501 – Ready for review: 15 test files / 139 unit tests pass, type-check clean, lint clean, no-backend build+preview shows no console errors.
- 2026-07-17T18:14:14Z – claude:sonnet:reviewer-renata:reviewer – shell_pid=33053 – Started review via action command
- 2026-07-17T18:17:10Z – user – shell_pid=33053 – Review passed: BackpackGrid + WeaponArmorList correctly render 10 categories/exact slot caps (max-filled empty math verified: soins 1 filled -> 14 empty, 96 total empty w/ zero items), weapons/armor pad to 3 via formatWeaponArmorStat with statNote-only badges shown verbatim (no synthesized numbers) and omitted when empty. PlayerView.vue consumes only useInventoryStore (no InventoryRepository import), old flat inventory list + vestigial 'équipé' badge fully removed, dons section untouched. slot-click emits are unwired in PlayerView per spec's explicit WP03 forward-compat instruction, not a read-only violation. No modals/save/remove calls introduced. type-check clean, lint clean (no diff after --fix), 139/139 unit tests pass across 15 files, no-backend build succeeds with zero console-breaking issues. WP02-owned diff scoped correctly to BackpackGrid.vue, WeaponArmorList.vue, their specs, and PlayerView.vue (broader stat diff is WP01 dependency merge, not WP02 work).
