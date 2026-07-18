# Quickstart — Inventory Slots & Dons System

## Validate the data layer (WP1)

```bash
npm run type-check        # vue-tsc --build
npm run lint              # oxlint + eslint --fix
npm run test:unit         # Vitest — includes inventoryText, InventoryRepository, useInventoryStore specs
```

The parser corpus test must cover: `(D4/−1)`, `(D10/+4)`, `(RD2)`, `(RD2 vs proj. magiques)`, `(vs proj. magiques)`, `(Armure impossible — Oracle)`, `Kit médical ×4`, bare names, and gift strings (`Turbo Fist — 2 mana / 1D10+2`, `Maîtrise des Armes : relance 1×/combat`).

## Regenerate/verify fixtures

```bash
node scripts/migrateInventoryFixtures.mjs   # deterministic; rewrites scripts/data/inventories.json + characters.json gifts
git diff --stat scripts/data/               # should be empty if fixtures are already migrated
```

## Seed a dev Firestore (optional, needs service-account key in scripts/keys/)

```bash
npm run seed:defaultchars:admin
node scripts/seedAll.mjs
```

## Validate the UI (later WPs)

```bash
npm run dev    # SSH box: forward the port (VSCode PORTS tab or ssh -L)
# open /campaigns/:id/joueur — backpack categories, armes/armures badges, don modal
npm run test:e2e
```

## No-backend degradation check (NFR-001)

Build without Firebase secrets (as GitHub Pages does): character page must render read-only with zero console errors.
