---
work_package_id: WP04
title: Dons cards & detail modal
dependencies:
- WP03
requirement_refs:
- FR-006
- FR-010
tracker_refs: []
planning_base_branch: feat/inventory-slots-dons
merge_target_branch: feat/inventory-slots-dons
branch_strategy: Planning artifacts for this mission were generated on feat/inventory-slots-dons. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/inventory-slots-dons unless the human explicitly redirects the landing branch.
subtasks:
- T018
- T019
- T020
- T021
agent: claude
history:
- 2026-07-17T16:47:51Z — created by /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: src/components/
create_intent:
- src/components/DonDetailModal.vue
- src/components/DonList.vue
- src/components/__tests__/DonDetailModal.spec.ts
- src/components/__tests__/DonList.spec.ts
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/components/DonList.*
- src/components/DonDetailModal.*
- src/components/__tests__/DonList.spec.*
- src/components/__tests__/DonDetailModal.spec.*
role: implementer
tags: []
---

# WP04 — Dons cards & detail modal

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load frontend-freddy
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Upgrade the dons section: gift cards showing MANA / DÉGÂTS badges when enriched data exists, click opening a detail modal with MANA / DÉS / BONUS stat tiles and multi-line flavor text. Passives show "—" and never fake zeros (FR-010).

## Context

- Enriched `CharacterGift` shape from WP01 (`data-model.md`): `manaCost?/manaNote?/damageDice?/damageBonus?`, `description` = real flavor text with `\n`.
- Legacy reference: cards `legacy-reference/index.html:3068-3102` (badges only when data present and not `—`), modal `3351-3367` + `4192-4215` (emoji header, three tiles, `white-space: pre-line` description).
- Reuses `AppModal.vue` (WP03) unchanged.
- **Out-of-map note**: swapping the dons `<section>` in `src/views/PlayerView.vue:499-507` (owned by WP02) for `<DonList>` — record a one-line rationale; sequential lanes, no collision.

Branch strategy: base/target `feat/inventory-slots-dons`; run `spec-kitty agent action implement WP04 --agent claude`, work in the reported lane worktree (copy `.env`, `npm install`).

## Subtasks

### T018 — `src/components/DonList.vue`

Props: `gifts: CharacterGift[]`. Card per gift: name (strip a leading emoji from display but keep it as the card icon, legacy-style), short effect line if `description`'s first line is short, badge cells — MANA (from `manaCost` or `manaNote`) and DÉGÂTS (`damageDice` + signed `damageBonus`) — rendered **only when the field exists**. Whole card clickable (button semantics) → emits `open` with the gift. Empty list → italic "Aucun don."

### T019 — `src/components/DonDetailModal.vue`

Composes `AppModal`. Props: `open`, `gift: CharacterGift | null`. Header: leading emoji (fallback `✦`) + name (emoji stripped). Three tiles in a row: MANA (`manaCost` + " mana", else `manaNote`, else "—"), DÉS (`damageDice` or "—"), BONUS (signed `damageBonus` or "—"). Below: `description` with `white-space: pre-line`. Close via AppModal semantics.

### T020 — PlayerView swap + passive rules

Replace the dons section markup in `PlayerView.vue` with `<DonList :gifts="character.gifts" @open="…">` + the modal. Verify passives (e.g. "Maîtrise des Armes") show no badges on the card and all-"—" tiles in the modal. All gifts open the modal (unlike legacy, which silently ignored gifts without `DONS_DATA` — with migrated data every gift has at least flavor text; this intentional improvement is already covered by spec FR-006).

### T021 — Component tests

`DonList.spec.ts`: badge presence/absence per field combinations, emoji stripping, `open` emission, empty state. `DonDetailModal.spec.ts`: tile values for enriched vs passive vs formula-mana (`manaNote: 'X'`) gifts, pre-line description rendering.

## Definition of Done

- [ ] Cards and modal render enriched, passive, and formula-mana gifts per the rules above (tested).
- [ ] AppModal reused without modification.
- [ ] PlayerView swap recorded as out-of-map edit; dons data comes from `character.gifts` (no new fetching).
- [ ] Gates green.

## Reviewer Guidance

- Feed the three gift archetypes (full combat, passive, formula-mana) through both components — zeros or "0 mana" appearing anywhere is a FR-010 violation.
- Check `\n` in description renders as line breaks, not literal text or collapsed whitespace.
