---
work_package_id: WP03
title: Slot editing modals & permissions
dependencies:
- WP02
requirement_refs:
- FR-003
- FR-009
tracker_refs: []
planning_base_branch: feat/inventory-slots-dons
merge_target_branch: feat/inventory-slots-dons
branch_strategy: mission-feature-branch
subtasks:
- T013
- T014
- T015
- T016
- T017
agent: claude
history:
- 2026-07-17T16:47:51Z — created by /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: src/components/
create_intent: []
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/components/AppModal.vue
- src/components/InventorySlotModal.vue
- src/components/__tests__/AppModal.spec.ts
- src/components/__tests__/InventorySlotModal.spec.ts
role: implementer
tags: []
---

# WP03 — Slot editing modals & permissions

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load frontend-freddy
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Per-slot add/edit/delete through a reusable modal, available only to the inventory's owner or mj/admin, persisting via `useInventoryStore` with French error surfacing (notably the category-full rejection).

## Context

- `contracts/data-layer.md` — store mutation API (WP01) and component names.
- Legacy behavior: `legacy-reference/index.html:3373-3409` (slot modal fields: name + quantity for backpack, name + stat text for equipment; delete only when editing an existing item; empty name on save = cancel) and `4168-4190` (modal layout). Legacy's "any signed-in user edits anything" is explicitly NOT ported — spec FR-009.
- Modal pattern base: inline overlay in `src/views/CampaignListView.vue:178,449-456` (fixed overlay, backdrop blur, `role="dialog"` `aria-modal="true"`).
- Role/ownership sources: `useAuthStore` (current user + role), inventory doc's `uid` field.
- **Out-of-map note**: wiring `slot-click` handlers requires small edits to `src/views/PlayerView.vue` (owned by WP02). Lanes are sequential so there is no collision; record a one-line rationale in your WP report for each out-of-map file touched.

Branch strategy: base/target `feat/inventory-slots-dons`; run `spec-kitty agent action implement WP03 --agent claude`, work in the reported lane worktree (copy `.env`, `npm install`).

## Subtasks

### T013 — `src/components/AppModal.vue` + test

Minimal reusable overlay: props `open: boolean`, `title?: string`; emits `close`; slot for body. Backdrop click and ✕ button close; `Escape` closes; `role="dialog"` + `aria-modal`; focus moves into the modal on open. Extract styling cues from the CampaignListView overlay — this becomes the app-wide modal, keep it unopinionated. Test: open/close behavior, escape key, backdrop vs content click.

### T014 — `src/components/InventorySlotModal.vue`

Composes `AppModal`. Props: `open`, `context: { kind: 'backpack', category: InventoryCategory, item?: InventoryItem } | { kind: 'weapons' | 'armor', item?: WeaponArmorItem }`. Fields:
- backpack: "Nom de l'objet" + "Quantité (optionnel)" (numeric, min 1).
- equipment: "Nom de l'objet" + stat input — label "Dégâts / particularité" (weapons, placeholder `ex : D10/+4`) or "Armure (RD) / particularité" (armor, placeholder `ex : RD4 ou Résiste au feu`); parse the stat text with `parseWeaponArmorText`-equivalent handling (name comes from the name field; run the stat string through the parser by wrapping as `name (stat)` or export a stat-only parse helper — keep losslessness).
- Editing an existing item pre-fills fields (stat pre-filled via `formatWeaponArmorStat`); "Supprimer" button only when editing.
- Emits `save` (payload ready for the store call) and `delete`; empty name on save = just close (legacy behavior).

### T015 — Slot-click wiring + role gating

In `PlayerView.vue` (out-of-map, recorded): open the modal from `BackpackGrid`/`WeaponArmorList` `slot-click` events **only when editable**. `canEdit = inventory.uid === currentUser.uid || role is mj/admin` — compute once in PlayerView, pass `editable` prop down to both display components so non-editors get no interactive affordances (slots render as plain elements, not buttons, when `editable` is false).

### T016 — Save/remove flows + errors

Wire modal `save`/`delete` to `saveBackpackItem` / `removeBackpackItem` / `saveEquipmentItem` / `removeEquipmentItem`. On `false` return, keep the modal open and display `useInventoryStore().error` (French) inside the modal — the cap-rejection message must be visible. On success close the modal.

### T017 — Editing-flow tests

`InventorySlotModal.spec.ts`: field variants per context kind, pre-fill on edit, delete-button visibility, empty-name-save closes without emit, save payload shapes. Plus a PlayerView-level assertion (existing `src/views/__tests__/` style) that `editable` is false for a non-owner joueur and true for mj.

## Definition of Done

- [ ] Owner and mj/admin can add/edit/delete backpack and equipment slots; changes persist through the store.
- [ ] Non-editors see zero edit affordances (checked by test).
- [ ] Category-full rejection surfaces the French store error in the modal.
- [ ] AppModal is generic (no inventory-specific code) — DonDetailModal (WP04) must be able to reuse it as-is.
- [ ] Gates green; out-of-map edits to PlayerView/BackpackGrid/WeaponArmorList listed with rationale.

## Reviewer Guidance

- Try the cap path mentally: nourriture already has 1 item, add another — store must reject, modal must show the message, Firestore write must not happen.
- Check `editable` gating is enforced at render (no hidden-but-clickable buttons).
- Verify AppModal accessibility basics (escape, aria attributes, focus).
