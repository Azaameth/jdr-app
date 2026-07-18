---
affected_files: []
cycle_number: 1
mission_slug: vitruve-character-sheet-01KXSZRT
reproduction_command:
reviewed_at: '2026-07-18T16:29:32Z'
reviewer_agent: unknown
verdict: rejected
wp_id: WP06
review_artifact_override_at: "2026-07-18T16:35:53Z"
review_artifact_override_actor: "operator"
review_artifact_override_wp_id: "WP06"
review_artifact_override_reason: "Review passed (cycle 2): FR-016 coverage added; new test mounts PlayerView, gives Furmiaou genuinely distinct attributes/injuries from the parent fixture, and asserts JetCalculator's attributes/injuries/contextKey props switch atomically to the child's on tab activation (with explicit .not.toEqual guards) and restore on switching back. Fix commit 66170f4 is test-only (59 lines, PlayerView.spec.ts only); type-check, lint, and unit (377/377) all green; production files unchanged since 706665d. Cycle-1 rejection (review-cycle-1.md) is superseded — this override records the cycle-2 approval."
---

---
cycle_number: 1
mission_slug: vitruve-character-sheet-01KXSZRT
wp_id: WP06
verdict: rejected
reviewer_agent: reviewer-renata
reviewed_at: '2026-07-18T18:40:00Z'
---

# WP06 review — cycle 1

Overall this is strong work: the active-context computed in `PlayerView.vue` is
correctly atomic (attributes + injuries + contextKey switch together, so the
FR-016 half-switched-context bug cannot occur), the child-session bootstrap
fallback is well-reasoned and safe, the raw editor is properly atomic with
solid junk-payload test coverage, the `CaracCategoryBlock` extraction is
clean and leaves `CaracTab.spec.ts` byte-for-byte untouched, and the e2e spec
honestly mirrors `inventory.spec.ts`'s unauthenticated-only strategy. Full
gate (type-check, lint, 376 unit tests, build, e2e chromium ×2) is green as
claimed. One finding blocks approval.

## Finding 1 (blocking): FR-016 has no test assertion — anti-pattern checklist item 4 fails

**FR-016** (`spec.md` line 120): "While a child tab is active, the jet
calculator computes from the child's attributes and injury states; leaving
the child context restores the parent's values." This FR is listed in
WP06's `requirement_refs` and is called out by name in the WP's own
Reviewer Guidance as "the subtle one."

The implementation is correct — `PlayerView.vue`'s `activeContext` computed
(lines ~140-165) atomically switches `attributes`/`injuries`/`contextKey`
together, and `JetCalculator` is fed from it via `:attributes`, `:injuries`,
`:context-key` bindings. Reading the code, I'm confident it's right.

But there is **no test anywhere in the diff that exercises this wiring**:

- `src/views/__tests__/PlayerView.spec.ts` never calls
  `wrapper.findComponent(JetCalculator)` — verified with
  `grep -n "JetCalculator" src/views/__tests__/PlayerView.spec.ts` (zero
  hits) and `grep -n "attributes\b" ...` (only hits are the fixture
  definition and unrelated `aria-selected`/`disabled` attribute checks).
- `JetCalculator.spec.ts` (unchanged by this WP) only unit-tests the
  component in isolation with hand-fed props — it cannot catch a
  regression in how `PlayerView` computes what to feed it.
- The manual walkthrough that would have covered this — `quickstart.md`
  step 5 ("calculator uses Furmiaou's stats while the tab is active") —
  was not performed either; `NEXTSTEPS.md`'s own follow-ups section
  admits quickstart steps 1-6 need a live Firebase session this
  environment can't produce.

So FR-016's core behavior — the exact thing the WP prompt warns is easy to
silently get half-right — currently has **zero automated or manual
verification**, only a code read (mine, and presumably the implementer's).
Per this WP's anti-pattern checklist item 4 ("every FR in
`requirement_refs` has at least one test assertion that references the
behavior it names... A FAIL on any item blocks approval"), this is a fail.

Note also that even a naive test would need care here: `PlayerView.spec.ts`'s
`furmiaou` fixture (`makeCharacter({ id: 'furmiaou', name: 'Furmiaou',
parentCharacterId: 'char-1', elements: [...] })`) does **not** override
`attributes`, so it currently has the exact same all-`1`s attributes as the
base `makeCharacter()` fixture. A test asserting prop equality against that
fixture as-is would pass even if the wiring silently fed the parent's
attributes to the child tab — it needs a distinguishable fixture to be a
real regression guard.

**Suggested fix**: add to the `describe('PlayerView — child character tabs
& raw editor (WP06)')` block in `PlayerView.spec.ts`:
1. A `furmiaou` variant (or a new local fixture) with attributes/injuries
   genuinely different from the parent's `currentCharacter`, plus a
   `currentParticipant` with both `session.injuries` (parent) and
   `childSessions.furmiaou.injuries` (child) populated with different
   states.
2. Mount, select the Furmiaou tab, `findComponent(JetCalculator)`, and
   assert its `attributes`/`injuries`/`contextKey` props equal the
   child's (`child.id`), not the parent's.
3. Switch back to a base tab (e.g. Caractéristiques) and assert the
   calculator's props revert to the parent's `attributes`/
   `participant.session.injuries`/`characterId`.

This is narrowly scoped — everything else in the WP (child-session
bootstrap, raw editor atomicity, `CaracCategoryBlock` extraction, e2e
honesty, NEXTSTEPS ledger, gate) checked out on the merits and needs no
changes.

## Anti-pattern checklist results

1. Dead code — PASS (`CaracCategoryBlock` has live callers in both
   `CaracTab.vue` and `ChildSheetTab.vue`; `RawCharacterEditor`/
   `ChildSheetTab` are wired into `PlayerView.vue`).
2. Synthetic-fixture test — PASS for `RawCharacterEditor.spec.ts` and
   `ChildSheetTab.spec.ts` (both exercise real component code paths,
   including the junk-`id`/`campaignId`/`role` payload case). See Finding 1
   for the one FR without any test at all (not "synthetic" — simply
   absent).
3. Silent empty return — PASS. All new guard `return`s
   (`ChildSheetTab.vue`/`CaracCategoryBlock.vue`'s `if (!canEdit) return`,
   `RawCharacterEditor.vue`'s parse-failure returns) are documented and set
   user-visible error state before returning where relevant.
4. FR coverage — **FAIL** (Finding 1, FR-016).
5. Frozen surface — PASS. No file in the mission's frozen/contract list is
   touched by 706665d.
6. Locked decision — PASS. e2e stays a smoke test with no write assertions
   per decision 01KXT0MF6T7BFAY5M3CZYWDBS9; raw editor strips `id`/
   `campaignId` per spec.
7. Shared-file ownership — PASS. `PlayerView.vue`/`CaracTab.vue` edits are
   out-of-map but explicitly pre-sanctioned by the WP06 task text itself
   ("out-of-map, record rationale") and documented in code comments and the
   commit message.
8. Production fragility — PASS. No new bare `raise`/throw in a
   request/worker path; `RawCharacterEditor`'s `catch` blocks convert
   errors to user-facing French messages rather than rethrowing.

## Verified independently

- `npm run type-check` — clean.
- `npm run lint` — clean, no fix-ups needed.
- `npm run test:unit -- --run` — 34 files, 376 tests, all pass.
- `npm run build` — succeeds.
- `CI=true npx playwright test --project=chromium e2e/vitruve.spec.ts` — 2/2
  pass, run twice back-to-back for flake confidence.
- `CI=true npx playwright test --project=chromium` (full suite) — 5/5 pass.
- Child-session bootstrap: confirmed `CharacterProfile` (`Character.ts`)
  carries no vitals fields, seeded Furmiaou vitals (48/48) live in
  `scripts/data/participants.json`'s `childSessions.furmiaou`, and both the
  seeded-session and null-session paths are covered in
  `ChildSheetTab.spec.ts` and `PlayerView.spec.ts`. The all-zero fallback is
  judged safe and sensible on the merits — it never produces NaN, and a
  child with `maxHp: 0` correctly renders both steppers disabled rather
  than allowing a misleading write.
- FR-017 (children excluded from rosters): confirmed via
  `usePlayerStore.ts`'s `party` computed (`if (character.parentCharacterId)
  continue`).
- NEXTSTEPS.md ledger: all six clusters marked done with accurate one-line
  status; follow-ups list includes `firestore.rules` deployment timing and
  the unported Dés d'Aventure feature, and honestly discloses that
  quickstart's live-Firebase manual steps were not performed in this
  environment (this honesty is itself the reason Finding 1 above is
  actionable rather than merely theoretical).
