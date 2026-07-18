---
cycle_number: 1
mission_slug: vitruve-character-sheet-01KXSZRT
wp_id: WP04
verdict: rejected
reviewer_agent: reviewer-renata
reviewed_at: '2026-07-18T12:07:00Z'
---

# Review Cycle 1 — WP04 (Changes Requested)

## Verdict

Changes requested. One blocking finding: duplicated category→primary/subs
mapping between `jetFormula.ts` (WP04) and `CaracTab.vue` (WP03).

**Issue 1**: `JET_CATEGORY_META` (in `src/components/vitruve/jetFormula.ts`, WP04) and `CaracTab.vue`'s local `defs` array (in `src/components/vitruve/CaracTab.vue:63-84`, WP03) both hard-code the same category → primary/subs mapping (physique→force/[puissance,finesse], social→social/[aura,relation], mental→mental/[instinct,savoir]) as two independent literal object structures. Neither file imports from the other or from a shared source — confirmed via `grep -rn "jetFormula\|JET_CATEGORY_META" src/components/vitruve/CaracTab.vue src/components/vitruve/__tests__/CaracTab.spec.ts` (zero hits). This is precisely the "two mapping tables drifting" cross-WP risk the WP04 reviewer guidance calls out to check for, and it is present: the values agree today only by coincidence, with nothing (no shared import, no cross-check test) preventing future divergence if either copy is edited independently.

Fix: have `CaracTab.vue` import and iterate `JET_CATEGORY_META` from `./jetFormula` for its category → primary/subs mapping instead of keeping its own duplicate `defs` literal (colors/short are jetFormula-only additions and don't need to move). This is a minimal, well-precedented out-of-map edit — WP04 already made one such edit to `PlayerView.vue` with a recorded rationale comment; do the same here (a short comment in `CaracTab.vue` noting the shared-source refactor and why). Since `CaracTab.vue` is WP03-owned, record the coordination note per the shared-file-ownership requirement.

Everything else checked out:
- 9-combination table re-derived independently against `adjustedCategoryPct` (base 60: ss→60, js/sj→50, jj/rs/sr→40, rj/jr→30, rr→5 pin) — matches `jetFormula.spec.ts` fixtures exactly.
- Clamp order verified correct in both `jetTotal`'s implementation and its regression test (pinned base 5 + mod +20 = 25, not 5).
- `jetFormula.ts` has zero Vue/Firestore imports (only type-only imports from Character/Participant models) — pure.
- `JetCalculator.spec.ts` mocks every conceivable store/repository surface (CharacterRepository, ParticipantRepository, usePlayerStore) and asserts zero calls across a full interaction sequence (category switch, mod steps, reset, contextKey change); component source imports only `jetFormula` and `tickState`, no store/repo writes.
- `AdvantageToggles.vue` binds `:checked` straight to `session.advantage`/`session.disadvantage` with no local shadow ref; test explicitly covers a prop update being reflected without a click; both toggles can be independently true; disabled when `!canEdit`.
- `canEditSession` (`PlayerView.vue:86`) verified to be effectively owner-or-MJ: the page-level guard (`PlayerView.vue:420-425`) redirects non-owner players to `forbidden`, so any player who reaches the session UI is either the owner or an mj/admin — consistent with its pre-existing use for HP/Mana. Reusing it for advantage/disadvantage (same `CharacterSessionState`) is sound and the rationale is documented inline.
- Tone boundaries (34/35/59/60) and the "+0%" mod label at zero both verified against tests and legacy source (`legacy-reference/index.html` ~l.875, `_jetMod>=0?'+':''` behavior preserved).
- `contextKey` watch resets both `manualMod` and `category`; `PlayerView.vue` passes `context-key="characterId"`; verified via the dedicated "resets manualMod and category to physique when contextKey changes" test.
- French legacy wording double-checked against `legacy-reference/index.html`: "Calculateur de jet", "Total à atteindre :", "Min. : 5%", "Max. : 95%", "Compétences :", "Avantages & Désavantages" all match exactly.
- Out-of-map `PlayerView.vue` edit (mounting both components, wiring toggles) is minimal, rationale is recorded inline, and `handleSetAdvantage`/`handleSetDisadvantage` mirror `handleSetInjury`'s optimistic-update + revert-on-error shape.
- Tick-reset integration: `PlayerView.vue`'s existing `watch(characterId, ...)` (from WP03) calls `tickState.reset()` — confirmed present, no gap.
- Dead code: both new components have live production callers in `PlayerView.vue`; no orphaned exports found.
- Validation: `npm run type-check`, `npm run lint`, `npm run test:unit` all exit 0 (328/328 tests pass), working tree clean after lint --fix.

Please rebase/notify WP05 once this cycle's fix lands, since WP05 depends on WP04.
