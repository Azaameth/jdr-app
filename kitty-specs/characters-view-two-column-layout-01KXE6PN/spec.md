# Mission Specification: Characters View Two-Column Layout

**Mission Branch**: `characters-view-two-column-layout-01KXE6PN`
**Created**: 2026-07-13
**Status**: Draft
**Input**: User description: "Improve characters view to have 2 'columns' of display instead of a long one."

## Assumptions *(read before planning)*

`src/views/PlayerView.vue` (the character sheet, embedded under the tab bar in
`PlayerListView.vue`) is the "characters view" this ask refers to — it's the one place in
the app that's currently "a long one": seven `.card` sections (Identité, Bonus de race et de
classe, Attributs, Compétences, Dons, Histoire, État de session) stacked vertically inside a
single `display: flex; flex-direction: column` container capped at `max-width: 860px`, so a
fully-populated character is a long scroll even on a wide desktop viewport.

The legacy monolith's equivalent (`legacy-reference/index.html`, `.vitruve-layout`, line 581:
`grid-template-columns: 300px 1fr`) used a narrow sidebar (character portrait/illustration)
next to a wide main content column — but that sidebar's content (portrait art, an MJ-only
inline edit zone, a "furm"/fiche tab switch) is a separate, larger legacy feature already
tracked in `MIGRATION_BACKLOG.md` as unported. **This spec does not port the portrait/edit-zone
sidebar** — it only reflows the existing, already-ported content sections into two columns
instead of one, which is the concrete "long one" problem stated in the request. Porting the
illustration sidebar is a natural follow-up but a distinct, larger scope.

`TeamView.vue` (the roster table, "dashboard") is a single wide table, not a long vertical
list — it's out of scope here; nothing about it matches "a long one."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View a character sheet without excessive scrolling on desktop (Priority: P1)

An MJ or player viewing a fully-populated character (all seven sections present) on a normal
desktop viewport currently has to scroll through one long vertical stack. They want to see
more of the sheet at once by using the available horizontal space.

**Why this priority**: This is the entire point of the request — without a real two-column
reflow, nothing changes.

**Independent Test**: Open a character with all sections populated on a viewport ≥1024px wide;
confirm the sections are arranged in two visual columns rather than one long single-file stack,
and that the total scroll height is visibly reduced compared to the current single-column
layout.

**Acceptance Scenarios**:

1. **Given** a character with all seven sections populated, **When** viewed on a desktop
   viewport (≥1024px), **Then** the sections render across two columns side by side.
2. **Given** the same character, **When** the section content in one column is taller than the
   other, **Then** the shorter column does not stretch or leave a large visually broken gap —
   layout remains visually balanced (exact balancing strategy — fixed section-to-column
   assignment vs. a masonry/auto-flow approach — is a plan-phase technical decision, not
   prescribed here).

---

### User Story 2 - Sheet remains usable on narrow viewports (Priority: P1)

A player checking their character sheet on a phone must not get a broken or unreadable
two-column squeeze.

**Why this priority**: Equal priority to US1 — a layout change that regresses mobile usability
is not an improvement, it's a trade of one problem for another. `TeamView.vue`'s existing
`@media (max-width: 800px)` collapse-to-one-column pattern (already used inside `PlayerView.vue`
for `.grid-2`/`.grid-3`/`.bonus-grid`) is the established precedent to extend, not replace.

**Independent Test**: Open the same character on a narrow viewport (≤800px, matching the
existing breakpoint already used inside this file); confirm sections stack in a single readable
column, matching current mobile behavior.

**Acceptance Scenarios**:

1. **Given** a character sheet, **When** viewed at ≤800px width, **Then** all sections render
   in a single column, full-width, in their original top-to-bottom reading order.

---

### User Story 3 - Reading order stays logical (Priority: P2)

A player scanning the sheet top-to-bottom (or via screen reader) should still encounter
sections in a sensible order, not have identity/attributes scattered unpredictably relative to
lore/inventory.

**Why this priority**: A naive CSS-only reflow (e.g. `column-count: 2` letting content flow
automatically) can visually split a section awkwardly or produce a DOM/visual order mismatch
that hurts accessibility; lower priority than US1/US2 because it's a quality bar on the
solution, not a separate deliverable.

**Independent Test**: Tab through the sheet with a keyboard / inspect DOM order; confirm it
matches a sensible reading order (e.g. Identité and Bonus first, since they're most referenced
during play; Compétences/Dons/Histoire/Session filling out the second logical grouping) and
that no single section (e.g. a long Dons list) visually splits across the column break.

**Acceptance Scenarios**:

1. **Given** the two-column layout, **When** inspecting DOM/tab order, **Then** it reads
   top-to-bottom, left-column-then-right-column (not an interleaved or reversed order).
2. **Given** any single section (e.g. a character with many gifts), **When** it renders,
   **Then** the section stays intact within one column — it does not visually split partway
   through mid-section.

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | User Story | Priority | Status |
|----|-------|------------|----------|--------|
| FR-001 | Two-column desktop layout | As an MJ/player, I want the character sheet's sections arranged in two columns on desktop so that I don't have to scroll through one long stack. | High | Open |
| FR-002 | Single-column mobile fallback | As a player on a phone, I want the sheet to remain single-column and readable so that the desktop change doesn't break mobile use. | High | Open |
| FR-003 | Sections stay visually intact | As a reader, I want each section to render as one unbroken block so that a section never visually splits across the column boundary. | Medium | Open |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Breakpoint consistency | The mobile collapse uses the same `800px` breakpoint already established inside `PlayerView.vue`'s `.grid-2`/`.grid-3`/`.bonus-grid` rules — not a new, different breakpoint value. | Consistency | Medium | Open |
| NFR-002 | No content regression | Every section, field, and conditional (`v-if`) already present in `PlayerView.vue` continues to render exactly as before — this is a layout-only change, not a content change. | Reliability | High | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | CSS-only where possible | Prefer a pure CSS layout change (grid/columns on the existing `.player-view` container and its `.card` children) over restructuring the template's section order/nesting, to minimize regression risk on a file with no existing automated test coverage. | Technical | High | Open |
| C-002 | Out of scope: portrait/illustration sidebar | The legacy `.vitruve-layout` asymmetric sidebar (character portrait, MJ inline edit zone, fiche/furm tab switch) is a separate, larger unported legacy feature (tracked in `MIGRATION_BACKLOG.md`) — not part of this mission. | Scope | High | Open |
| C-003 | Follow existing view conventions | No new component library, no new state-management pattern — this is a template/style-only change to an existing `<script setup lang="ts">` view. | Technical | Medium | Open |

### Key Entities *(include if feature involves data)*

None — this is a presentation-only change; no data model is touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a ≥1024px viewport, a fully-populated character sheet renders its sections
  across two visual columns.
- **SC-002**: On a ≤800px viewport, the sheet renders as a single column, matching today's
  behavior.
- **SC-003**: No section's content, field, or `v-if` conditional changes — a visual diff of
  rendered content (not layout) against the current implementation shows no regressions.
- **SC-004**: `npm run type-check`, `npm run lint`, and `npm run test:unit` all pass. Since
  `PlayerView.vue` has no existing unit test, this mission adds a minimal one asserting all
  expected sections still render for a fixture character (guards NFR-002, not layout itself —
  layout is verified manually per Definition of Done in the work package, since CSS grid
  placement isn't meaningfully unit-testable with the current test stack).
