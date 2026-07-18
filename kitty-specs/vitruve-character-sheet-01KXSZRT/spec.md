# Mission Specification: Vitruve Character Sheet Layout

**Mission**: `vitruve-character-sheet-01KXSZRT`
**Created**: 2026-07-18
**Status**: Draft
**Target branch**: `feat/vitruve-character-sheet`

## Intent Summary

- **Primary actor**: a *joueur* (player) viewing their own character, and the *MJ* (game master) viewing/editing any character.
- **Trigger**: opening a character page (`PlayerView`) during or between game sessions.
- **Desired outcome**: the character page is restructured into the legacy "vitruve" two-column layout — a left sheet with identity, vitals, portrait, jet calculator, avantages/désavantages, live group status, and adventure-dice reminder; and a right tabbed panel (Fiche, Caractéristiques, Dons, Inventaire, plus one tab per child character). The Dons and Inventaire content already shipped by the inventory mission is reused unchanged.
- **Key invariants**: only the character's owner or `mj`/`admin` can modify its values; the jet total is always clamped to 5–95%; the hardcoded legacy "Furmiaou" tab becomes a data-driven **child character** relationship (a character can have multiple children).
- **Deliberate divergences from legacy** (confirmed by the project owner, 2026-07-18): injury states and avantage/désavantage toggles are **persisted and synced in real time** (legacy kept them in memory only); the Furmiaou tab is generalized to child characters; the jet calculator stays **display-only** (no dice-roller integration).

Discovery interview completed 2026-07-18: placement (restructure `PlayerView`), left-column scope (all four widgets), child-character model, jet-calculator mode, persistence, and branch strategy were all explicitly confirmed by the project owner.

## User Scenarios & Testing

### Primary scenarios

1. **Consulter sa fiche** — A player opens their character and sees the two-column layout: left, the sheet header (name + "race · classe · niv. · élément"), PV and Mana pills with ± steppers, the portrait, the jet calculator, the Avantage/Désavantage toggles, the live "État du groupe", and the "Dés d'Aventure" reminder; right, the tabbed panel opened on **Fiche** (race, genre, langues, valeurs, histoire).
2. **Suivre une blessure** — During a session, the player (or MJ) clicks the injury square of a sub-caractéristique in the **Caractéristiques** tab, cycling saine → jaune → rouge → saine. The category percentage visibly drops (−10% per jaune, −20% per rouge, floor 5%, hard 5% if both subs are rouge), the change is persisted, and every other viewer of that character sees it within seconds.
3. **Préparer un jet** — The player selects a category (Physique / Social / Mental) in the calculator, ticks one or more compétences or bonus/malus de race in the Caractéristiques tab, adjusts the manual modifier in ±5% steps, and reads the total to reach — always between 5% and 95%, color-coded by difficulty. Nothing is rolled; the dice roller remains a separate feature.
4. **Surveiller le groupe** — Any viewer sees, in "État du groupe", the live PV/Mana of every approved character of the campaign; when the MJ or another player adjusts a character's PV, the list updates in real time without reload.
5. **Jouer une transformation** — Firm's player opens their character and sees a **Furmiaou** tab (because Furmiaou is registered as a child character of Firm). The tab shows Furmiaou's own mini-sheet: portrait, PV with ± steppers (persisted), Mana, element badges, and its three caractéristique blocks with their own injury states. The jet calculator, while this tab is active, computes from Furmiaou's values. Characters without children see no extra tab.
6. **Permissions** — A joueur can modify only their own character's session values (PV, Mana, posture, blessures, avantage/désavantage, child sessions); the MJ/admin can modify any character's. The MJ-only "Éditer les données brutes" control is invisible to players. Adventure-dice counters are adjustable by MJ/admin only.

### Edge cases

- Both sub-caractéristiques of a category rouge → the category is pinned at 5% (not base − 40).
- Jet total would exceed 95% or drop below 5% → it is clamped; the manual modifier itself is bounded to [−100, +100].
- A character with no compétences beyond the six sub-caractéristiques shows "Aucune compétence spéciale." and the Compétences line of the calculator stays hidden while no box is ticked.
- The per-campaign adventure-dice document doesn't exist yet → the reminder box renders with 0 / 0 instead of crashing; the first MJ adjustment creates it.
- A child tab is active and the viewer switches to a character without children → the panel falls back to the Fiche tab.
- Firebase not configured (public demo build) → the page renders read-only with no errors; steppers, toggles, and editors are absent or inert.
- A joueur navigating to another player's character URL is still denied (existing behavior preserved).

## Domain Language

| Canonical term | Meaning | Avoid |
|---|---|---|
| layout vitruve | The two-column sheet layout (left sheet + right tabbed panel) | "fiche perso" for the layout itself |
| caractéristique | One of the 3 categories: Physique, Social, Mental (percentage) | "stat", "attribut" in UI |
| sous-caractéristique | The 6 secondary axes: Puissance, Finesse, Aura, Relation, Instinct, Savoir | "compétence" (reserved, see below) |
| compétence | A skill beyond the 6 sous-caractéristiques, worth rang × 10% in the calculator | — |
| blessure / état | Injury state of a sous-caractéristique: saine, jaune, rouge | "dégât" |
| calculateur de jet | The display-only threshold calculator | "lanceur de dés" |
| personnage enfant | A character owned by another character (transformation, e.g. Furmiaou) | "forme", "onglet furm" |
| état du groupe | The always-visible live PV/Mana list of the party | — |
| dés d'aventure | The shared campaign counters Aventure / Mésaventure | — |
| MJ | Game master role (`mj`), full edit rights | "DM" |

## Schema Contract (locked)

Stable surface other missions may rely on. Names are final; downstream specs reuse them verbatim.

```ts
// src/models/types/Character.ts
interface CharacterProfile {
  // …existing fields unchanged…
  parentCharacterId?: string // set on child characters (transformations); children are full profiles in the same collection
}

// src/models/types/Participant.ts
type InjuryState = 'jaune' | 'rouge' // absence of entry = saine
type SecondaryAttributeName = 'puissance' | 'finesse' | 'aura' | 'relation' | 'instinct' | 'savoir'
interface CharacterSessionState {
  // …existing fields unchanged…
  injuries?: Partial<Record<SecondaryAttributeName, InjuryState>>
  advantage?: boolean
  disadvantage?: boolean
}
interface Participant {
  // …existing fields unchanged…
  childSessions?: Record<string, CharacterSessionState> // keyed by child characterId; children get no participant doc of their own
}

// src/models/types/CampaignSession.ts (new)
interface CampaignSessionState {
  id: string // == campaignId
  campaignId: string
  adventureDice: { aventure: number; mesaventure: number }
  updatedAt?: string
}
// Firestore: collection `campaignSessions`, doc id = campaignId
// Repository: src/models/repositories/CampaignSessionRepository.ts
// Store: src/controllers/useCampaignSessionStore.ts
```

Category mapping (legacy → new model):

| Catégorie | Base % source (primary) | Sous-caractéristiques (secondary) |
|---|---|---|
| Physique | `attributes.primary.force` | `puissance`, `finesse` |
| Social | `attributes.primary.social` | `aura`, `relation` |
| Mental | `attributes.primary.mental` | `instinct`, `savoir` |

## Requirements

### Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| FR-001 | The character page (`PlayerView`) is restructured into the vitruve two-column layout: a fixed-width left sheet and a flexible right tabbed panel; columns stack vertically on narrow viewports. | Confirmed |
| FR-002 | The left sheet header shows the character name and the subtitle "race · classe · Niv.N · élément(s)"; below it, PV and Mana pills show current/max with − / + steppers that persist to the participant session and sync in real time to all viewers (existing behavior preserved in the new layout). | Confirmed |
| FR-003 | The left sheet shows the character portrait (image, or class-icon fallback when absent). | Confirmed |
| FR-004 | An "Éditer les données brutes" control, visible to `mj`/`admin` only, lets the MJ edit the raw character document; invalid input is rejected with a French error message and no partial write. | Confirmed |
| FR-005 | The jet calculator offers a category selector (Physique / Social / Mental) and displays the adjusted base % of the selected category: `max(5, base − 10×nb_jaune − 20×nb_rouge)`, pinned to 5 when both sous-caractéristiques are rouge. | Confirmed |
| FR-006 | Compétences (rang × 10%) and bonus/malus de race entries listed in the Caractéristiques tab each carry a checkbox; the sum of ticked values appears as a "Compétences : ±X%" line in the calculator (hidden when the sum is 0) and feeds the total. Tick states are per-viewer and ephemeral (reset on reload). | Confirmed |
| FR-007 | A manual Bonus/Malus adjusts in ±5% steps within [−100, +100] with a reset control; the displayed total = clamp(base_ajustée + compétences + manuel, 5, 95), color-coded (≥60 favorable, 35–59 medium, <35 risky) with the "Min. 5% / Max. 95%" hints. The calculator triggers no dice roll. | Confirmed |
| FR-008 | Avantage and Désavantage toggles are shown in the left sheet; their state is persisted on the participant session and synced in real time to all viewers; both may be active simultaneously. | Confirmed |
| FR-009 | "État du groupe" lists every approved participant character of the campaign (name, PV, Mana) updating in real time, always visible in the left sheet; child characters are excluded from this list. | Confirmed |
| FR-010 | The "Dés d'Aventure" box shows the campaign's shared Aventure and Mésaventure counters in real time; `mj`/`admin` can adjust them with ± controls; other roles see them read-only; a missing document renders as 0 / 0. | Confirmed |
| FR-011 | The right panel has tabs Fiche, Caractéristiques, Dons, Inventaire, plus one tab per child character of the displayed character; the Dons and Inventaire tabs reuse the existing components and behavior with no functional regression. | Confirmed |
| FR-012 | The Fiche tab shows race, genre, and langues cards, valeurs as pills, and the histoire text; the histoire is editable by the character's owner or `mj`/`admin`, and edits persist. | Confirmed |
| FR-013 | The Caractéristiques tab shows PV/Mana/Niveau summary cards, the posture selector (reusing the existing persisted posture with its effects tooltip), and the three category blocks, each with its adjusted % bar and its two sous-caractéristiques with clickable injury squares cycling saine → jaune → rouge → saine. | Confirmed |
| FR-014 | Injury states are persisted per character (`session.injuries`), synced in real time, and modifiable by the character's owner or `mj`/`admin` only. | Confirmed |
| FR-015 | A character may have multiple child characters (`parentCharacterId`); each child appears as its own tab rendering a mini-sheet: portrait, PV with ± steppers, Mana, element badges, and its three caractéristique blocks with independent injury states, persisted under the parent participant's `childSessions`. | Confirmed |
| FR-016 | While a child tab is active, the jet calculator computes from the child's attributes and injury states; leaving the child context restores the parent's values. | Confirmed |
| FR-017 | Child characters never appear as standalone members in player lists, team views, or "État du groupe". | Confirmed |
| FR-018 | Seed data registers Furmiaou as a child character of Firm Bintaggle with the legacy reference stats (PV 48/48, Mana 0/0 "Aucune magie", éléments Nature + Transmutation, Physique 65 / Social 50 / Mental 55, puissance 5, finesse 2, aura 3, relation 2, instinct 5, savoir 1). | Confirmed |

### Non-Functional Requirements

| ID | Requirement | Status |
|---|---|---|
| NFR-001 | Session-state changes (PV, Mana, blessures, toggles, dés d'aventure) are visible to other connected viewers in under 2 seconds under normal network conditions. | Confirmed |
| NFR-002 | The layout is usable from 768px viewport width up; below that, the two columns stack without horizontal scrolling. | Confirmed |
| NFR-003 | Without a configured backend (public demo build), the page renders 100% of its read-only content with zero console errors; all mutating controls are hidden or inert. | Confirmed |
| NFR-004 | All user-facing strings are French, consistent with existing app tone; the 7 legacy widget titles (Calculateur de jet, Avantages & Désavantages, État du groupe, Dés d'Aventure, Fiche, Caractéristiques + tab labels) keep their legacy wording. | Confirmed |
| NFR-005 | The jet-calculator formula (adjustment, clamping, pinning) is covered by unit tests over the full state space of one category (all 9 jaune/rouge combinations of its two sous-caractéristiques). | Confirmed |

### Constraints

| ID | Constraint | Status |
|---|---|---|
| C-001 | New stores follow the singleton-composable pattern (`useCampaignStore.ts` reference); new repositories follow the `if (!db) return …` fallback pattern with `{ id: doc.id, ...doc.data() }` mapping (DIR-003). | Confirmed |
| C-002 | `legacy-reference/index.html` is a behavior spec, not code to copy; all UI is implemented idiomatically in Vue SFCs (DIR-004). | Confirmed |
| C-003 | The role model is enforced both client-side and in `firestore.rules` for every newly writable surface: participant session extensions (owner or `mj`/`admin`), `campaignSessions` (write: `mj`/`admin`; read: campaign members). | Confirmed |
| C-004 | The Schema Contract section above is locked before implementation; field and file names must not drift during the mission, and downstream missions may depend on them. | Confirmed |
| C-005 | Existing Dons/Inventaire behavior, unit tests, and e2e tests keep passing (no regression); existing `PlayerView` capabilities (session steppers, posture, resolveCharacterId gating) are preserved through the restructure. | Confirmed |
| C-006 | This is a high-complexity mission: it is delivered as sequential acceptance-criteria clusters (schema/contract first), with the increment ledger maintained in `NEXTSTEPS.md`. | Confirmed |

## Success Criteria

- SC-001: A player finds every piece of their character's information (identity, vitals, caractéristiques, dons, inventaire, transformations) on a single page without navigating elsewhere.
- SC-002: An injury or vitals change made by one viewer is visible to a second connected viewer in under 2 seconds and survives a page reload on both sides.
- SC-003: For every reachable combination of injuries, ticked modifiers, and manual adjustment, the displayed jet total stays within 5–95% and matches the documented formula (verified by automated tests).
- SC-004: With seeded data, Firm's page shows a working Furmiaou tab with independent vitals; every other seeded character shows exactly the four base tabs.
- SC-005: The full CI suite (type-check, lint, unit, e2e) passes, including the pre-existing inventory/dons e2e scenarios, demonstrating zero regression.

## Key Entities

- **CharacterProfile** — existing; gains optional `parentCharacterId` establishing the parent→children relationship (children are full profiles in the same collection).
- **Participant / CharacterSessionState** — existing; session gains `injuries`, `advantage`, `disadvantage`; participant gains `childSessions` keyed by child characterId.
- **CampaignSessionState** — new per-campaign shared state document carrying the adventure-dice counters.
- **Race / Class** — existing; source of bonus/malus de race entries and class-icon fallback (read-only in this mission).

## Assumptions

- The full "Dés d'Aventure" feature (dice pool mechanics, dedicated page) remains a separate future mission; this mission only introduces the shared counters, their display, and MJ ± adjustment. Counters default to 0/0.
- Calculator tick-states (compétences, bonus/malus) are deliberately ephemeral: they model a single roll's preparation, not durable character state.
- Child characters are created via seed scripts or the MJ raw-data editor; no dedicated "create child" UI is in scope.
- The posture mechanic (selector, effects, persistence) already exists and is reused, not redesigned.
- Portrait images continue to come from the character's `img` field; no upload feature is in scope.

## Suggested Delivery Clusters

For `/spec-kitty.plan` and the `NEXTSTEPS.md` ledger (C-006); each cluster lands green before the next starts:

1. **Contract** — types, repositories, store extensions, `firestore.rules`, seed updates (FR-018 data, schema surface).
2. **Skeleton** — two-column layout, left header/vitals/portrait, tab bar hosting existing Dons/Inventaire (FR-001–003, FR-011 partial, C-005).
3. **Fiche & Caractéristiques** — tabs, injuries, compétences list, posture placement (FR-012–014).
4. **Calculateur & toggles** — jet calculator, avantage/désavantage (FR-005–008).
5. **Groupe & dés** — état du groupe, dés d'aventure box (FR-009–010).
6. **Personnages enfants** — child tabs, child sessions, calculator context switch, Furmiaou seed, MJ raw editor (FR-004, FR-015–018).
