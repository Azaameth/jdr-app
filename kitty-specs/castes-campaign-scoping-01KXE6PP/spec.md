# Mission Specification: Castes Campaign Scoping

**Mission Branch**: `castes-campaign-scoping-01KXE6PP`
**Created**: 2026-07-13
**Status**: Draft
**Input**: User description: "Place 'Castes' information in the DB with a campaign relationship."

## Assumptions *(read before planning)*

Castes/factions are **already in Firestore** — shipped 2026-07-12 via spec-kitty mission
`faction-caste-browser-01KXBRY3` (`FactionRepository.listFactions()`, collection `factions`,
seeded through `scripts/uploadStaticDataAdmin.mjs`). That mission's own `data-model.md`
made a deliberate, explicit decision at the time: "Not campaign-scoped, not user-editable, no
relationship to `Campaign`... same data across all campaigns for this pass, consistent with
how races/classes work today" (spec.md Edge Cases) — this was correct for a single-campaign
app, but factions are the *only* one of the three reference-data collections without a
`campaignId` field: `races` and `classes` both get `campaignId` stamped on upload
(`uploadStaticDataAdmin.mjs` lines 65/79) and are queried with `where('campaignId', '==', ...)`
(`RaceRepository.ts`, `ClassRepository.ts`). Factions get neither (line 89 sets no
`campaignId`; `listFactions()` takes no campaign parameter).

This mission reverses that earlier decision: give factions the same `campaignId` scoping
races/classes already have, so different campaigns can eventually have different castes/lore
instead of one global set. This is a direct, concrete step toward the broader multi-campaign
architecture work being planned separately (see the project's architecture roadmap doc) — it's
scoped narrowly here to just this one collection, not a rewrite of the multi-campaign story.

**No production data migration in this mission** (matching the boundary already established
in the `character-data-dashboard-integration` mission's C-002): the existing 8 seeded factions
get `campaignId` the same way races/classes already do — by re-running
`uploadStaticDataAdmin.mjs`, which already clears-and-reseeds races/classes on every run. This
mission extends that same clear-and-reseed behavior to factions (it doesn't today — see FR-003)
rather than writing a special one-off backfill script.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Factions are fetched per campaign, like races/classes (Priority: P1)

An MJ or player viewing the Castes browser for campaign A should only see campaign A's
factions, not a global set shared across every campaign in the app.

**Why this priority**: This is the entire point of the request — without campaign-scoped
fetching, nothing changes for the end user even if the field exists in the database.

**Independent Test**: Seed two campaigns with different faction sets; open the Castes browser
for campaign A, confirm only campaign A's factions appear; switch to campaign B, confirm only
campaign B's factions appear.

**Acceptance Scenarios**:

1. **Given** campaigns A and B each have their own seeded factions, **When** an MJ opens the
   Castes browser for campaign A, **Then** only campaign A's factions render in the tab list.
2. **Given** a campaign with zero factions seeded, **When** its Castes browser is opened,
   **Then** it shows the existing "no data" empty state (matching how `RaceCarouselView`/
   `ClassCarouselView` already handle an empty catalog) rather than falling back to a global
   list or erroring.

---

### User Story 2 - Seed script attaches campaignId to factions (Priority: P1)

The admin seeding pipeline needs to actually write `campaignId` on each faction document,
matching how it already does for races/classes.

**Why this priority**: Without this, User Story 1 has no real data to query against — this is
the concrete DB-side half of "place castes information in the DB with a campaign relationship."

**Independent Test**: Run `uploadStaticDataAdmin.mjs` against a test project; inspect the
written `factions` documents; confirm each has a `campaignId` field matching the same value
races/classes received in the same run.

**Acceptance Scenarios**:

1. **Given** `scripts/data/factions.json` (unchanged content) and a target `campaignId`,
   **When** `uploadStaticDataAdmin.mjs` runs, **Then** every faction document written has a
   `campaignId` field equal to the run's target campaign.
2. **Given** the script is re-run for a different `campaignId`, **When** it completes,
   **Then** factions from the previous run's campaign are not deleted (matching the
   per-campaign, additive nature of how this script would need to treat factions differently
   from races/classes — see Edge Cases below).

---

### Edge Cases

- **Races/classes are fully cleared and rewritten on every script run** (`clearCollection`),
  which is safe today because they're already scoped by whatever single `campaignId` the
  script's env var points at each time — but repeatedly clearing *all* `races`/`classes`
  regardless of campaign was already a latent multi-campaign bug before this mission, out of
  scope to fix here. Factions must **not** get the same blanket clear-then-write treatment
  once they're campaign-scoped, or seeding campaign B's factions would delete campaign A's —
  this mission's script change should only clear/overwrite factions belonging to the target
  `campaignId`, not the whole collection (see FR-003).
- Same `scripts/data/factions.json` content is reused for now (no new lore is authored by this
  mission) — every campaign that gets seeded via this script ends up with the same 8 factions,
  just now tagged with that campaign's id. Giving different campaigns genuinely different
  castes is a future content task, not part of this mission.
- `FactionBrowserView.vue`'s route already resolves `campaignId` (used today only for
  `CampaignShell`) — no routing change needed, only the data-fetch call changes.

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | User Story | Priority | Status |
|----|-------|------------|----------|--------|
| FR-001 | `campaignId` field on Faction | As a developer, I want `Faction` to carry a `campaignId` so that factions can be queried per campaign like races/classes. | High | Open |
| FR-002 | Campaign-scoped faction query | As an MJ/player, I want the Castes browser to only show my campaign's factions so that different campaigns can eventually diverge. | High | Open |
| FR-003 | Seed script writes campaignId, scoped clear | As a maintainer, I want the seed script to stamp `campaignId` on factions and only clear that campaign's factions (not the whole collection) so that seeding one campaign doesn't destroy another's data. | High | Open |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | No content regression | The 8 factions' title/subtitle/badge/description/facts content is unchanged — only the scoping mechanism changes. | Reliability | High | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | Match races/classes pattern exactly | `FactionRepository`'s new campaign-scoped query follows `RaceRepository.listRacesByCampaign`/`ClassRepository.listClassesByCampaign` verbatim in shape (`where('campaignId', '==', campaignId)`), not a new pattern. | Technical | High | Open |
| C-002 | No production data migration script | Existing live faction documents (if any exist in production beyond the dev/seed project) are not touched directly by this mission — campaignId is only ever set via re-running the existing seed script, same boundary as the character-data-dashboard-integration mission's C-002. | Process | High | Open |
| C-003 | Firestore rules alignment | `firestore.rules`' `factions/{id}` match block (currently read: any signed-in, write: false — global, not campaign-checked) does not need to change for this mission, since campaign scoping here is a query-shape/data-field change, not an access-control change; note if a future mission wants per-campaign faction *write* access, rules would need revisiting then, not now. | Technical | Medium | Open |

### Key Entities *(include if feature involves data)*

- **Faction** (`src/models/types/Faction.ts`): existing shape (`id, order, icon, title, subtitle, badge, accent, description, facts[]`) gains one new required field: `campaignId: string`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Castes browser only shows factions belonging to the currently-open campaign.
- **SC-002**: `uploadStaticDataAdmin.mjs` writes `campaignId` on every faction document, and
  re-running it for a different campaign does not delete a previously-seeded campaign's
  factions.
- **SC-003**: All 8 factions' content is unchanged from before this mission — verified by the
  existing `FactionBrowserView.spec.ts` unit test (updated to pass a `campaignId` through its
  mocked repository call) continuing to pass.
- **SC-004**: `npm run type-check`, `npm run lint`, and `npm run test:unit` all pass.
