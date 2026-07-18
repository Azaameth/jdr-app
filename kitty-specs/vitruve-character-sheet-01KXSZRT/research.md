# Research: Vitruve Character Sheet Layout

**Mission**: `vitruve-character-sheet-01KXSZRT` · **Date**: 2026-07-18

All spec-level clarifications were resolved during discovery; this document records the technical decisions behind the plan and the legacy-behavior extraction.

## D-01 — Real-time updates via repository `subscribe*` functions

- **Decision**: Introduce Firestore `onSnapshot` through repository-level `subscribe*(…, callback): Unsubscribe` functions. When `!db`, they invoke the callback zero times and return a no-op `() => {}`. Stores own listener lifecycle: attach when the consuming view mounts / campaign changes, detach on unmount. This is the codebase's **first** real-time usage (verified: no `onSnapshot` under `src/` today).
- **Rationale**: NFR-001 (<2s propagation) rules out polling one-shot reads. Keeping `onSnapshot` inside repositories preserves DIR-003's layering (views never import Firestore). Returning the standard `Unsubscribe` handle mirrors the Firebase SDK and keeps stores testable with fake callbacks.
- **Alternatives considered**: (a) Polling with `setInterval` — simpler but violates the 2s target at reasonable cost and adds read quota waste. (b) VueFire bindings — new dependency, second store pattern, rejected under DIR-003. (c) Listeners directly in components — leaks Firestore imports into the view layer.
- **Follow-through**: CLAUDE.md conventions section gains one line about the `subscribe*` pattern when it lands (DIR-002).

## D-02 — Child sessions under the parent participant (no participant docs for children)

- **Decision**: Child characters are full `CharacterProfile` docs (same `characters` collection) carrying `parentCharacterId`; their volatile state lives in `Participant.childSessions[childCharacterId]` on the **parent's** participant doc.
- **Rationale**: One participant doc per player keeps the approval flow (`status: pending/approved/rejected`) untouched — a transformation is not a party member and must never appear in rosters (FR-017). One doc also means one listener covers parent + children vitals. The parent's owner naturally owns child state under existing rules.
- **Alternatives considered**: (a) Separate participant docs per child — pollutes rosters/approval and needs join filtering everywhere. (b) Session state embedded in the character doc — mixes durable identity with volatile session data, contrary to the existing Participant/Character split.

## D-03 — `campaignSessions` collection for shared adventure dice

- **Decision**: New top-level collection `campaignSessions`, doc id = campaignId, holding `adventureDice: { aventure, mesaventure }`. Read: campaign members; write: `mj`/`admin` only. Missing doc renders as 0/0; first MJ adjustment creates it (merge write).
- **Rationale**: The full "Dés d'Aventure" feature is a later mission; a dedicated shared-state doc gives it a stable home without touching the `campaigns` doc (whose writes are MJ-gated for different reasons and which is read in list contexts where this state is noise).
- **Alternatives considered**: (a) Field on the campaign doc — couples volatile counters to campaign metadata reads/writes. (b) Subcollection `campaigns/{id}/state` — deeper path for no benefit; top-level matches every existing repository's collection-per-file shape.

## D-04 — Ephemeral calculator state, persisted injury/toggle state

- **Decision**: Calculator inputs (selected category, manual modifier, ticked compétences/race modifiers) are per-viewer component state, reset on character switch and reload. Injury states and avantage/désavantage persist on the participant session and sync live.
- **Rationale**: Ticks model *one roll being prepared* — sharing them across viewers would corrupt each other's calculations mid-session. Injuries and toggles are table-visible facts (confirmed by owner 2026-07-18, diverging deliberately from legacy's in-memory-only behavior).
- **Alternatives considered**: Persisting ticks per user — no user value, extra writes.

## D-05 — Legacy formula extraction (behavioral ground truth)

Extracted from `legacy-reference/index.html` (`updateJetDisplay` ~l.3255, `getAdjustedPct` ~l.3238, `getCheckedBonus` ~l.3215, carac rendering ~l.3020):

- Adjusted category %: `both subs rouge → 5`; else `max(5, base − 10×nb_jaune − 20×nb_rouge)`.
- Compétence tick value: `rank × 10%`; race bonus/malus tick value: parsed signed integer from the entry.
- Total: `clamp(adjusted + ticked_sum + manual, 5, 95)`; manual bounded [−100, +100] in ±5 steps.
- Total color: ≥60 favorable / 35–59 medium / <35 risky.
- Category → data mapping (new model): Physique→`primary.force` (`puissance`,`finesse`); Social→`primary.social` (`aura`,`relation`); Mental→`primary.mental` (`instinct`,`savoir`).
- Furmiaou reference stats for the seed (FR-018): PV 48/48, Mana 0/0 ("Aucune magie"), éléments Nature + Transmutation, Physique 65 / Social 50 / Mental 55, puissance 5, finesse 2, aura 3, relation 2, instinct 5, savoir 1.
- Legacy party-status and adventure-dice widgets are always-visible left-column boxes; adventure counters default display 0/0 when no state exists (mission-level choice; legacy pulled from its unported dice feature).

## D-06 — Testing strategy

- **Decision**: Unit-test the jet formula over the full 9-combination injury state space of a category plus clamp/pin edges (NFR-005) and the new repositories' `!db` fallbacks; add one browser-agnostic Playwright smoke spec (layout renders, tabs switch, dons/inventaire content present). Existing suites are the non-regression gate (SC-005). Decision recorded: 01KXT0MF6T7BFAY5M3CZYWDBS9.
- **Rationale**: Formula correctness is pure logic — cheapest at unit level; the restructure risk (breaking existing view wiring) is exactly what a smoke e2e catches. Full-flow e2e (writes, multi-client sync) would need an emulator setup that doesn't exist yet — out of proportion for this mission.
- **Alternatives considered**: Firebase emulator e2e — real value for sync assertions but new infra; deferred.

## D-07 — Delivery shape

- **Decision**: Six sequential WPs ≈ spec's Suggested Delivery Clusters, single lane, each green (type-check/lint/unit; e2e where relevant) before the next; `NEXTSTEPS.md` ledger maintained. Decision recorded: 01KXT0MDBTHK7AMPR1T7SC17KZ.
- **Rationale**: Matches the project's committed high-complexity workflow (CLAUDE.md); avoids the known coordination-worktree vitest gotcha and merge overhead of parallel lanes for a single-maintainer project.
