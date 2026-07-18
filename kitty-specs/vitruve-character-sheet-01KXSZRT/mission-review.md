# Mission Review Report: vitruve-character-sheet-01KXSZRT

**Reviewer**: claude (orchestrator, post-merge mission review)
**Date**: 2026-07-18
**Mission**: `vitruve-character-sheet-01KXSZRT` — Vitruve Character Sheet Layout
**Baseline commit**: `eb290af` (merge-base with `main`)
**HEAD at review**: post-merge `feat/vitruve-character-sheet` (merge commit `68bdbb1` + post-merge chores)
**WPs reviewed**: WP01–WP06 (all `done`; 30 commits, 75 files, +9594/−596)

---

## Gate Results

### Gate 1 — Contract tests
- **N/A for this repository** — no `tests/contract/` suite exists (that gate targets the spec-kitty repo itself). Equivalent evidence: WP01's review diffed every shipped signature against `contracts/session-state-api.md` verbatim; no drift found then or now.

### Gate 2 — Architectural tests
- **N/A** — no `tests/architectural/` suite. Equivalent evidence: DIR-003 layering held — components import only stores (`grep` for `firebase`/`firestore` in `src/components/vitruve/` returns zero hits); all Firestore access is repository-level.

### Gate 3 — Cross-repo E2E
- **N/A** — single-repo project. Equivalent charter gate run post-merge on the integration branch: `npm run type-check` ✓, `npm run lint` ✓, `npm run test:unit` 377/377 ✓, `npm run build` ✓, `CI=true npx playwright test --project=chromium` 5/5 ✓. GitHub CI on PR #3: **pass** (run 29652674211).

### Gate 4 — Issue Matrix
- **N/A** — `spec.md` references no GitHub issues; no `issue-matrix.md` is required. No `unknown`/`in-mission` verdicts exist anywhere.

No hard gate applies and fails; the applicable (charter) gates all pass.

**Event-log scan**: zero `ReviewerSelfApproval` events, zero forced/arbiter approvals. Two clean rejection cycles (WP04 cycle 1: duplicated category mapping; WP06 cycle 1: missing FR-016 coverage), both resolved by narrow fixes and independently re-approved.

---

## FR Coverage Matrix

| FR | Brief | WP | Test evidence | Adequacy | Finding |
|----|-------|----|---------------|----------|---------|
| FR-001 | Two-column layout, responsive | WP02 | PlayerView.spec (layout/tab host) + chromium e2e | ADEQUATE | — |
| FR-002 | Header + PV/Mana ± persisted, live sync | WP02 | VitruveSheet.spec (emits/gating) | PARTIAL | [DRIFT-1] |
| FR-003 | Portrait + fallback | WP02 | VitruveSheet.spec (3 fallback paths) | ADEQUATE | — |
| FR-004 | MJ raw editor, atomic, French errors | WP06 | RawCharacterEditor.spec (8 cases incl. junk-payload strip) | ADEQUATE | — |
| FR-005 | Adjusted base % formula | WP03/04 | tickState.spec + jetFormula.spec (full 9-combo space) | ADEQUATE | — |
| FR-006 | Checkable compétences/bonus, ±X% line | WP03/04 | CaracTab.spec + JetCalculator.spec | ADEQUATE | — |
| FR-007 | Manual mod, clamp 5–95, tones, display-only | WP04 | jetFormula.spec (clamp-order regression case) + zero-write assertion | ADEQUATE | — |
| FR-008 | Avantage/Désavantage persisted, live | WP04 | AdvantageToggles.spec | PARTIAL | [DRIFT-1] |
| FR-009 | État du groupe live, children excluded | WP05 | PartyStatus.spec + usePlayerStore.spec | ADEQUATE | — |
| FR-010 | Dés d'aventure, MJ ±, 0/0 default | WP05 | AdventureDiceBox.spec (buttons-absent DOM assertion) | ADEQUATE | [RISK-2 low] |
| FR-011 | Tab set + child tabs, no regression | WP02/06 | PlayerView.spec; 9 pre-existing inventory tests preserved | ADEQUATE | — |
| FR-012 | Fiche tab + histoire edit (owner/MJ) | WP03 | FicheTab.spec; rules `hasOnly(['backstory','updatedAt'])` | ADEQUATE | valeurs omitted per accepted finding U1 |
| FR-013 | Carac tab, injury squares, posture | WP03 | CaracTab.spec (cycle emits, mapping single-sourced post-WP04-fix) | ADEQUATE | — |
| FR-014 | Injuries persisted, real-time, gated | WP01/03 | usePlayerStore.spec (map computation) | PARTIAL | [DRIFT-1] |
| FR-015 | Child characters, mini-sheet, childSessions | WP06 | ChildSheetTab.spec (13) + PlayerView.spec | ADEQUATE | — |
| FR-016 | Calculator follows child context | WP06 | PlayerView.spec FR-016 case (distinguishable fixtures, added cycle 2) | ADEQUATE | — |
| FR-017 | Children never in rosters | WP01/05 | usePlayerStore.spec (real Firm/Furmiaou fixture) | ADEQUATE | — |
| FR-018 | Furmiaou seed | WP01 | code_review (values diffed against legacy) | ADEQUATE | live seeding is a human step |

---

## Drift Findings

### DRIFT-1: The viewed character's own sheet is not live for remote viewers

**Type**: PARTIAL-FR (FR-002 / FR-008 / FR-014 "synced in real time to all viewers"; NFR-001)
**Severity**: MEDIUM
**Evidence**: `src/views/PlayerView.vue:67` — `participant = ref<Participant | null>(null)` is populated once in `loadCharacter()` (`:600`, via `getParticipantByCharacterId`) and mutated only by local optimistic writes. No `watch` on `playerStore.party` exists (grep: zero hits). The live `subscribeParticipantsByCampaign` snapshot feeds **only** the `party` computed consumed by `PartyStatus`.

**Analysis**: When viewer B changes a character's PV/injuries/toggles, viewer A sees the change within 2s **in the État du groupe widget** (PV/Mana), but A's main pills, injury squares, and toggles for that same character stay stale until reload, because they bind to the one-shot `participant` ref. FR-002's wording ("existing behavior preserved") makes the pills arguably compliant, but FR-014's "synced in real time" for injuries is only partially delivered — the sync plumbing exists and works; the sheet simply doesn't consume it for the viewed character. Per-WP reviews missed this because each surface was verified in isolation (PartyStatus live ✓, pills "preserved behavior" ✓). **Suggested follow-up (small)**: derive/update `participant` from the live party snapshot when it contains the viewed characterId — the subscription is already attached; no new listener needed. Injury squares, toggles, and pills then go live for all viewers.

No non-goal invasions, no locked-decision violations, no punted FRs beyond the accepted U1 (valeurs). NFRs: NFR-002/003/004/005 verified (responsive CSS, zero-console-error e2e, French strings diffed against legacy, formula state space tested); NFR-001 is partially met per DRIFT-1 (met for État du groupe; not for the sheet surfaces) and its full two-client check remains the documented manual step.

---

## Risk Findings

### RISK-1: `getCampaignSession` is dead code
**Type**: DEAD-CODE · **Severity**: LOW · **Location**: `src/models/repositories/CampaignSessionRepository.ts`
**Trigger**: none (never called from `src/` outside tests; `subscribeCampaignSession` is used instead).
**Analysis**: Contract-mandated surface shipped for the future Dés d'Aventure mission. Harmless, unit-tested, documented in the locked contract — keep, but the follow-up mission should become its first caller or it should be dropped then.

### RISK-2: Adventure-dice adjust errors are stored but not surfaced
**Type**: ERROR-PATH · **Severity**: LOW · **Location**: `src/components/vitruve/AdventureDiceBox.vue`
**Trigger**: MJ clicks ± while offline / rules-denied.
**Analysis**: `useCampaignSessionStore().adjust` catches into `error` (French message, correct store shape), but the widget never renders `store.error` — the click silently does nothing visible. Other new error refs (`advDisError`, `caracError`, `childError`, `sessionError`) **are** rendered in `PlayerView.vue` (`:673`, `:721`, `:767`), so this is the one inconsistent surface.

### RISK-3: Child roster is one-shot per character load
**Type**: CROSS-WP-INTEGRATION · **Severity**: LOW
**Analysis**: `children` and the party's character join are fetched once per `loadCharacter`; a child or character added mid-session appears only after navigation/reload (raw-editor saves do trigger a full reload, covering the MJ's own edits). At this table's scale, acceptable; noted for completeness.

---

## Silent Failure Candidates

| Location | Condition | Silent result | Spec impact |
|----------|-----------|---------------|-------------|
| `AdventureDiceBox.vue` (via store) | `adjustAdventureDice` write fails | counter unchanged, no visible error | FR-010 UX only (RISK-2) |
| Repository `!db` guards (all new fns) | Firebase unconfigured | no-op/defaults | **By design** — NFR-003, unit-tested per function |

No `catch → return ""/null` patterns outside the sanctioned `!db` convention were found in the mission's diff.

## Security Notes

| Finding | Location | Risk class | Recommendation |
|---------|----------|------------|----------------|
| Owner character writes rules-restricted to `backstory`+`updatedAt` via `diff().affectedKeys().hasOnly()` | `firestore.rules` | privilege containment | Verified tightening-only in WP01 review; **deploy of rules remains pending** (known follow-up) — until deployed, the new client surfaces rely on client-side gating only |
| Raw editor strips `id`/`campaignId` before write, rejects invalid JSON atomically | `RawCharacterEditor.vue` | doc-identity integrity | Tested incl. junk payloads; MJ-trust surface, acceptable |
| No subprocess/shell/network additions; no new credential handling | — | — | — |

---

## Final Verdict

**PASS WITH NOTES**

All 18 FRs trace to shipped code with adequate tests except the real-time reach of FR-002/008/014 (DRIFT-1, MEDIUM — the sync exists and is user-visible in État du groupe, but the viewed sheet itself is not live for remote viewers). No locked decision was violated, no non-goal invaded, the two rejection cycles resolved cleanly with independent re-review, all applicable quality gates pass locally and in CI (PR #3), and the two clean-up risks are LOW. Nothing blocks release.

### Open items (non-blocking)
1. **DRIFT-1**: wire `participant` to the live party snapshot (small change, big UX honesty win for FR-014).
2. **RISK-2**: render `campaignSessionStore.error` in `AdventureDiceBox`.
3. **RISK-1**: first caller for `getCampaignSession` in the future Dés d'Aventure mission, or drop it there.
4. Human steps from `NEXTSTEPS.md`: live-Firebase quickstart walkthrough, `seed:defaultchars:admin`, firestore.rules deployment.

## Retrospective Reminder

`kitty-specs/vitruve-character-sheet-01KXSZRT/retrospective.yaml` exists (authored at merge terminus, mission_number 4). Surface findings with `spec-kitty retrospect summary` (cross-mission, read-only) and `spec-kitty agent retrospect synthesize --mission vitruve-character-sheet-01KXSZRT` (dry-run; `--apply` to mutate).
