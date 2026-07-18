# Quickstart: Vitruve Character Sheet Layout

**Mission**: `vitruve-character-sheet-01KXSZRT`

## Run & verify locally

```bash
npm run dev            # dev server (remote box: forward the port — VSCode PORTS tab or ssh -L)
npm run test:unit      # Vitest — includes jet-formula state-space tests (NFR-005)
npm run test:e2e       # Playwright — includes the vitruve smoke spec
npm run lint && npm run type-check
```

Seeding (needs `scripts/keys/` service account for admin variants):

```bash
npm run seed:defaultchars:admin   # after FR-018: seeds Furmiaou as child of Firm
```

## Manual verification walkthrough

1. Sign in as a `joueur`, open your character → two-column vitruve layout; Fiche tab active; Dons/Inventaire tabs behave exactly as before.
2. Click an injury square in Caractéristiques (jaune) → category % drops by 10; reload → state kept; second browser/session sees it < 2s.
3. In the calculator: pick a category, tick a compétence, add +5% → total = adjusted base + tick + 5, always within 5–95%; both subs rouge → base pinned at 5%.
4. Toggle Avantage → persists and syncs; État du groupe shows all approved party characters live; Dés d'Aventure shows counters (0/0 if never set; ± visible only as MJ).
5. As Firm's player: Furmiaou tab present → own PV ± persists under the parent participant; calculator uses Furmiaou's stats while the tab is active. Other characters: no extra tab.
6. As MJ: "Éditer les données brutes" opens the raw editor; invalid JSON is rejected with a French message and writes nothing.
7. Demo build check (no Firebase env): page renders read-only, zero console errors, no steppers/toggles/editor.

## Key file map

- View shell: `src/views/PlayerView.vue`
- Vitruve components: `src/components/vitruve/`
- Types: `src/models/types/{Character,Participant,CampaignSession}.ts`
- Data access: `src/models/repositories/{Participant,Character,CampaignSession}Repository.ts`
- Stores: `src/controllers/{usePlayerStore,useCampaignSessionStore}.ts`
- Rules: `firestore.rules` (deployment = README "Known follow-ups")
- Ledger: `NEXTSTEPS.md` (cluster status, per C-006)
