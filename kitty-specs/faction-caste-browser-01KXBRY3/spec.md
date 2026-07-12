# Mission Specification: Faction/Caste Browser

**Mission Branch**: `faction-caste-browser-01KXBRY3`
**Created**: 2026-07-12
**Status**: Draft
**Input**: User description: "Port the faction/caste browser (the 'classeur' binder UI) from legacy-reference/index.html — 8 factions/castes (Téméraires, Rose Noire, Ordre du Savoir, Paysans, Nobles, Marchands, Fonctionnaires, Religieux) with tabbed navigation, each showing a description and key facts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse factions by tab (Priority: P1)

A campaign member (player or MJ) opens the faction/caste reference from within a campaign and clicks through tabs — one per faction/caste — to read each one's lore.

**Why this priority**: This is the core value of the feature — without tab switching there's no "browser," just a wall of text.

**Independent Test**: Navigate to the castes route, click each tab in turn, confirm the corresponding faction's content replaces the previous one and the clicked tab shows as active.

**Acceptance Scenarios**:

1. **Given** the castes view is open with Téméraires active by default, **When** the player clicks the "Rose Noire" tab, **Then** the Rose Noire fiche (title, subtitle, status badge, description, key-facts grid) replaces the Téméraires content and the Rose Noire tab is visually marked active.
2. **Given** any tab is active, **When** the player reloads the page, **Then** the view resets to the first tab — no requirement to persist tab selection across reloads for this pass.

---

### User Story 2 - Read a faction's key facts at a glance (Priority: P2)

A player wants to quickly compare factions (e.g. "who's hostile, who's neutral") without reading full paragraphs.

**Why this priority**: The legacy content separates a scannable badge + key-facts grid from prose — losing that structure regresses readability, but the feature is usable without it (P1 covers the core browse loop).

**Independent Test**: Open any faction and confirm the status badge and key-facts grid render distinctly from the prose paragraph.

**Acceptance Scenarios**:

1. **Given** the Téméraires fiche is open, **When** the player looks at it, **Then** they see a status badge ("Alliance active"), a 4-cell key-facts grid (Structure, Objectif, Statut, Base), and a separate descriptive paragraph.
2. **Given** the Paysans fiche is open, **When** the player looks at it, **Then** they see a 2-cell grid, not 4 — grid size varies per faction (2–4 cells) and the layout must not break with fewer cells.

---

### User Story 3 - Access from within a campaign (Priority: P3)

A player navigates to the faction browser the same way they already navigate to Races/Classes — from the campaign sidebar.

**Why this priority**: Nice-to-have consistency; the feature delivers value even reachable only by direct URL, but sidebar discovery matches existing UX and is cheap to add alongside P1.

**Independent Test**: From any page inside a campaign, click "Castes" in the `CampaignShell` sidebar's "Campagne" group and confirm it lands on the faction browser for that campaign.

**Acceptance Scenarios**:

1. **Given** a player is on the Races view for campaign X, **When** they click "Castes" in the sidebar, **Then** they land on the faction browser route for campaign X.

---

### Edge Cases

- Deep-linking to a specific faction tab (e.g. a shared URL) is out of scope for this pass — always opens on the first tab. Possible follow-up: a route/query param per tab.
- On narrow viewports, 8 tabs won't fit in one row — tabs should wrap or scroll horizontally rather than clip, matching the responsive pattern already in `CampaignShell.vue` (`@media (max-width: 900px)`).
- Content is static reference lore, not campaign-specific — same data across all campaigns for this pass, consistent with how races/classes work today.

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | User Story | Priority | Status |
|----|-------|------------|----------|--------|
| FR-001 | Tabbed faction navigation | As a campaign member, I want to click through faction tabs so that I can browse all factions/castes without leaving the page. | High | Open |
| FR-002 | Faction detail display | As a campaign member, I want each faction's title, subtitle, status badge, description, and key-facts grid displayed so that I can understand who they are at a glance and in depth. | High | Open |
| FR-003 | Sidebar entry point | As a campaign member, I want a "Castes" link in the campaign sidebar so that I can find this view the same way I find Races/Classes. | Medium | Open |
| FR-004 | Default tab on load | As a campaign member, I want the browser to open on the first faction by default so that there's always a sensible starting point. | Low | Open |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Tab switch responsiveness | Switching tabs updates the displayed fiche in under 100ms (client-side state change once data is loaded, no per-tab network round-trip). | Performance | Medium | Open |
| NFR-002 | Responsive tab layout | Tab row remains usable (wraps or scrolls, doesn't clip) down to a 360px-wide viewport. | Usability | Medium | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | Firestore-backed, matching races/classes | Faction/caste data is fetched from a Firestore collection (e.g. `factions`) via `getDocs`/`query`, and seeded through an admin script following `scripts/uploadStaticDataAdmin.mjs`'s existing pattern from a new `scripts/data/factions.json` — not bundled as local static JSON in the frontend. Matches how `RaceCarouselView`/`ClassCarouselView` already source reference data, rather than introducing a second pattern for the same kind of content. | Technical | High | Open |
| C-002 | Follow existing view conventions | New view/component code follows this project's existing patterns (`<script setup lang="ts">`, view under `src/views/`, rendered inside `CampaignShell`) rather than introducing a new structural pattern. | Technical | High | Open |
| C-003 | Content fidelity | Faction names, subtitles, badges, descriptions, and key-facts must match `legacy-reference/index.html` (lines ~1157–1342) — this mission ports existing lore, it doesn't invent new lore. | Business | High | Open |

### Key Entities *(include if feature involves data)*

- **Faction/Caste**: id, icon, title, subtitle, status badge text, accent color, description paragraph, key-facts (ordered list of label/value pairs, count varies 2–4 per faction). Static reference content, not user-editable, not campaign-specific.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 8 factions from the legacy file are viewable, with content matching the source (title, subtitle, badge, description, key-facts).
- **SC-002**: A player can reach the faction browser from any other page inside a campaign in 2 clicks or fewer.
- **SC-003**: `npm run type-check`, `npm run lint`, and `npm run test:unit` all pass with the new view/component included, with at least one unit test covering tab-switching behavior.
