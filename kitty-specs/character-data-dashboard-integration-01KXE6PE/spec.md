# Mission Specification: Character Data / Dashboard Integration

**Mission Branch**: `character-data-dashboard-integration-01KXE6PE`
**Created**: 2026-07-13
**Status**: Draft
**Input**: User description: "Migrate all characters related data from membership in the firebase and link it in the dashboard."

## Assumptions & Open Question *(read before planning)*

The current code already separates character identity/build data (`CharacterProfile`,
Firestore `characters/{id}`) from live session data (`Membership`, Firestore
`memberships/{id}`, holding `hp`/`mana`/`posture`/`inventory`) — there is no field
duplication between the two types today (verified by reading `Character.ts`,
`Membership.ts`, and both repositories). The legacy monolith (`legacy-reference/index.html`)
used one flat `charData` object per character mixing both concerns; the seed pipeline
(`scripts/generateCharacterData.mjs`, run over `scripts/data/defaultChars.json`) already
splits that flat shape into `characters.json` + `memberships.json` before upload — but only
for the 5 default characters, and only through the seed path.

**Open question for the spec owner to confirm before `/spec-kitty.plan` locks in a technical
approach**: does "migrate characters related data from membership" mean —
(a) the CRUD layer is incomplete (`CharacterRepository`/`MembershipRepository` only have
`list`/`get`, no `create`/`update` — see `MIGRATION_BACKLOG.md` item 1), so today the *only*
way to create/update a character is by re-running the admin seed scripts, which is the real
gap to close, or
(b) there is legacy-shaped or otherwise malformed data already sitting in the live Firestore
project that needs a one-off data migration/backfill script, separate from the app code?

This spec assumes **(a)** — closing the CRUD gap — as the primary scope, since it's the
concrete, code-verifiable gap and directly unblocks "link it in the dashboard" (the dashboard
can't display data that was never written through the app). If (b) is also needed, it requires
inspecting live production Firestore data first (a step this spec deliberately does not take —
see Constraints), and should be scoped as a follow-up once someone has actually looked at the
production collections.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - MJ/admin creates a character record through the app (Priority: P1)

An MJ (game master) or admin currently has no in-app way to create a `characters/{id}` +
`memberships/{id}` pair — the only path is running an admin script against a JSON fixture.
They need to create both from within the app so onboarding a new player doesn't require
shell access.

**Why this priority**: Without a `create` path, "migrating data from membership" has nowhere
to land — the CRUD gap is the actual blocker underneath the user's request.

**Independent Test**: From a campaign an MJ manages, create a new character (name, race,
class, owner), confirm a `characters/{id}` doc and a matching `memberships/{id}` doc (status
`pending` or `approved`, default session state) both exist in Firestore and the character
appears in the dashboard (Team view).

**Acceptance Scenarios**:

1. **Given** an MJ is viewing a campaign with no characters yet, **When** they submit the
   "new character" form with name/race/class/owner, **Then** a `CharacterProfile` and a
   `Membership` are created together, and the new character appears in the Team view.
2. **Given** the create form is submitted with a race/class that doesn't exist in that
   campaign's `races`/`classes` collections, **When** validation runs, **Then** the app
   rejects the submission with a French error message rather than writing an invalid
   `raceId`/`classId`.

---

### User Story 2 - Dashboard shows resolved character data, not raw IDs (Priority: P1)

Today `TeamView.vue` (the "Situation globale" dashboard) joins `characters` and
`memberships` correctly but renders `character.raceId` / `character.classId` as literal
strings (e.g. `kitsune`, `cogneur`) instead of the race/class names a player would recognize.

**Why this priority**: This is the concrete "link it in the dashboard" ask — the join already
happens, but the display is unreadable without resolving through `RaceRepository`/
`ClassRepository`.

**Independent Test**: Open the Team view for a campaign with seeded characters/races/classes
and confirm the Race/Classe columns show human-readable names (e.g. "Kitsune", "Cogneur"),
not raw IDs.

**Acceptance Scenarios**:

1. **Given** a campaign has characters referencing valid `raceId`/`classId` values, **When**
   the MJ opens the Team view, **Then** the table shows the resolved race and class names.
2. **Given** a character references a `raceId`/`classId` that no longer exists in that
   campaign's `races`/`classes` collections (orphaned reference), **When** the Team view
   renders that row, **Then** it shows a fallback (e.g. the raw ID or "—") instead of a blank
   cell or a crash.

---

### User Story 3 - MJ/admin updates an existing character's identity data (Priority: P2)

An MJ needs to fix a typo'd name or bump a level without re-running the seed script.

**Why this priority**: Completes the CRUD gap from User Story 1; lower priority than create
because create is the harder blocker (no character existing today can be entered any other
way for a *new* player), but update is needed for this to be a real workflow rather than a
one-shot.

**Independent Test**: From the Team view or player detail view, an MJ edits a character's
name/level and confirms the change persists and displays immediately.

**Acceptance Scenarios**:

1. **Given** an MJ opens an existing character's detail view, **When** they edit the name
   field and save, **Then** `characters/{id}.name` updates in Firestore and the new name
   shows in the Team view without a manual page reload.

---

### Edge Cases

- A character with `status: 'pending'` on its membership (not yet approved) — should it show
  in the dashboard at all, or only approved ones? Legacy behavior and current `TeamView`
  code make no distinction (it lists everyone returned by `listMembershipsByCampaign`); this
  spec keeps that behavior — no filtering by status — since changing it is a product decision
  outside this mission's scope.
- Creating a character without an existing `Membership` (or vice versa) must not be possible
  through the new create path — the two writes are one operation (batch/transaction), not two
  independent forms, so the dashboard never has to handle a character with no membership at
  all (today's `membershipByUid.get(...) ?? undefined` fallback exists for pre-existing data
  only, not for new writes going forward).

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | User Story | Priority | Status |
|----|-------|------------|----------|--------|
| FR-001 | Create character + membership together | As an MJ, I want to create a new character and its membership in one action so that a new player can be onboarded without shell access. | High | Open |
| FR-002 | Resolve race/class names in the dashboard | As an MJ, I want the Team view to show race/class names instead of raw IDs so that the roster is actually readable. | High | Open |
| FR-003 | Update character identity fields | As an MJ, I want to edit an existing character's name/level/etc. so that I can fix mistakes without re-seeding. | Medium | Open |
| FR-004 | Graceful fallback for orphaned race/class references | As an MJ, I want a broken race/class reference to show a fallback, not a blank or crash, so a bad reference doesn't break the whole roster view. | Medium | Open |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Atomic create | Character + membership creation either both succeed or both fail (no orphaned half-written records). | Reliability | High | Open |
| NFR-002 | Role gating | Create/update character actions are only reachable by `mj`/`admin` roles, consistent with `CampaignView`'s existing `canEdit` pattern. | Security | High | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | Repository pattern | New `create*`/`update*` functions in `CharacterRepository.ts`/`MembershipRepository.ts` follow the existing `if (!db) return …` no-op guard and `mapX()` normalizer convention, not a new pattern. | Technical | High | Open |
| C-002 | No production data inspection in this mission | This mission does not query or modify live production Firestore data directly — only app code, repositories, and the dashboard view. If open question (b) above turns out to be real (actual malformed legacy data in prod), that is a separate follow-up requiring an explicit human decision to touch production data, same as the parked `firestore.rules` deployment decision. | Process | High | Open |
| C-003 | Firestore rules alignment | Any new write path this mission adds must be checked against `firestore.rules` (`characters/{id}` and `memberships/{id}` match blocks) even though those rules aren't deployed yet — don't design a write shape the rules can't express. | Technical | Medium | Open |

### Key Entities *(include if feature involves data)*

- **CharacterProfile** (`characters/{id}`): identity/build data — name, raceId, classId,
  level, attributes, skills, gifts, lore. Already defined in `src/models/types/Character.ts`.
- **Membership** (`memberships/{id}`): campaign enrollment + live session state — status,
  personalNote, session (hp/mana/posture/inventory). Already defined in
  `src/models/types/Membership.ts`.
- **Race / Class**: reference data already fetched via `RaceRepository`/`ClassRepository`,
  needed here only to resolve `raceId`/`classId` to display names in the dashboard.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An MJ can create a fully-formed character (with its membership) entirely
  through the UI, with zero shell/admin-script steps.
- **SC-002**: The Team view ("dashboard") shows resolved race/class names for every character
  with a valid reference, and a visible fallback (not a blank cell) for orphaned references.
- **SC-003**: An MJ can edit an existing character's name/level through the UI and see the
  change reflected in the Team view without a manual reload.
- **SC-004**: `npm run type-check`, `npm run lint`, and `npm run test:unit` all pass, with new
  unit test coverage for the create/update repository functions and the dashboard's
  race/class resolution (including the orphaned-reference fallback case).
