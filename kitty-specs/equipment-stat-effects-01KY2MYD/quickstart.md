# Quickstart — Equipment Stat Effects

## Validate the schema + aggregation package (IC-01–IC-03, must be green before display work starts — C-006)

```bash
npm run type-check        # vue-tsc --build
npm run lint              # oxlint + eslint --fix
npm run test:unit         # Vitest — includes effectiveStats.spec.ts, useInventoryStore.spec.ts
```

`effectiveStats.spec.ts` must cover the combinations named in NFR-002: single equipped bonus, two stacked equipped bonuses (additive), an unequipped item with a `statBonus` (contributes 0), an item with only `statNote` and no `statBonus` (contributes 0), and child-vs-parent isolation (a `computeEffectiveMaxStat` call with the child's own items never sees the parent's items, and vice versa — exercised at the store/component level via `useInventoryStore.spec.ts`, since the pure function itself only ever sees one `items` array by construction).

## Seed fixture check (FR-008)

```bash
node scripts/uploadStaticDataAdmin.mjs   # or npm run seed:static:admin — needs scripts/keys/serviceAccountKey.json
git diff --stat scripts/data/inventories.json   # should show the +4 Mana Ring example once added
```

## Validate the UI (display work package, after IC-01–IC-03 are green)

```bash
npm run dev    # SSH box: forward the port (VSCode PORTS tab or ssh -L)
# open /campaigns/:id/joueur for a character with an equipped statBonus item:
# - displayed max HP/Mana includes the bonus (SC-001)
# - unequip via RawCharacterEditor.vue -> displayed max drops back (SC-002)
# - a child/transformation tab shows its own effective max, independent of the parent's (SC-004)
npm run test:e2e   # REQUIRED (charter Quality Gates: WP02 touches PlayerView.vue, a full view) — existing e2e/vitruve.spec.ts is smoke-level only, must still pass green; no new e2e spec is required by this mission's FRs
```

## No-backend degradation check (NFR-001)

Build without Firebase secrets (as GitHub Pages does): character page must render with the raw stored max HP/Mana (no equipped items ⇒ effective max equals base max) and zero console errors.
