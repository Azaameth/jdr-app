---
work_package_id: WP01
title: Faction/caste browser end-to-end
dependencies: []
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-004
- NFR-001
- NFR-002
- C-001
- C-002
- C-003
tracker_refs: []
planning_base_branch: dev
merge_target_branch: dev
branch_strategy: Planning artifacts for this mission were generated on dev. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into dev unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
- T007
agent: "claude"
assignee: "claude"
history: []
agent_profile: frontend-freddy
authoritative_surface: src/
create_intent:
- src/models/types/Faction.ts
- src/models/repositories/FactionRepository.ts
- src/views/FactionBrowserView.vue
- src/views/__tests__/FactionBrowserView.spec.ts
- scripts/data/factions.json
- e2e/castes.spec.ts
execution_mode: code_change
model: ''
owned_files:
- src/models/types/Faction.ts
- src/models/repositories/FactionRepository.ts
- src/views/FactionBrowserView.vue
- src/views/__tests__/FactionBrowserView.spec.ts
- src/components/layout/CampaignShell.vue
- src/router/index.ts
- scripts/data/factions.json
- scripts/uploadStaticDataAdmin.mjs
- e2e/castes.spec.ts
role: implementer
tags: []
shell_pid: "26930"
---

# Work Package Prompt: WP01 – Faction/caste browser end-to-end

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Port the 8-faction "classeur" browser from `legacy-reference/index.html` (lines ~1157–1342) into the current Vue app: a Firestore-backed `factions` collection, a repository, a tabbed browsing view reachable from the campaign sidebar.

## Context

This is the first real spec-kitty mission for jdr-app — a small, single-WP, self-contained feature chosen specifically to prove out the mission workflow on low product-design risk. See `spec.md` for full requirements and `plan.md` for technical context and rationale (notably: Firestore-backed, not bundled JSON — matches how `RaceCarouselView`/`ClassCarouselView` already source reference data).

Read before starting:
- `legacy-reference/index.html` lines 1157–1342 (source content — copy faithfully, don't paraphrase French copy)
- `src/views/RaceCarouselView.vue` (data-loading pattern: `onMounted` → Firestore query → `cards`/`loading`/`error` refs)
- `src/models/repositories/CampaignRepository.ts` (repository conventions: `if (!db) return …`, `{ id: doc.id, ...doc.data() }` mapping)
- `src/components/layout/CampaignShell.vue` (sidebar structure, `sidebar-links` group)
- `src/router/index.ts` (route conventions: `path`, `name`, lazy `component`, `meta: { requiresAuth: true }`)
- `scripts/uploadStaticDataAdmin.mjs` (existing seed-script pattern for races/classes)

### Subtask T001: Add the `Faction` type

**Purpose**: Define the shape of a faction/caste record.

**Steps**:
1. Create `src/models/types/Faction.ts`:
   ```ts
   export interface FactionFact {
     label: string
     value: string
   }

   export interface Faction {
     id: string
     order: number
     icon: string
     title: string
     subtitle: string
     badge: string
     accent: string
     description: string
     facts: FactionFact[]
   }
   ```
   `order` exists because Firestore doesn't preserve insertion order — the repository query sorts by it to keep tabs in the legacy file's original sequence (Téméraires, Rose Noire, Ordre du Savoir, Paysans, Nobles, Marchands, Fonctionnaires, Religieux).

**Files**: `src/models/types/Faction.ts` (new, ~15 lines)
**Validation**: `npm run type-check` passes.

### Subtask T002: Add `FactionRepository`

**Purpose**: Fetch factions from Firestore, following the established repository pattern.

**Steps**:
1. Create `src/models/repositories/FactionRepository.ts`:
   - `const FACTIONS_COLLECTION = 'factions'`
   - `export async function listFactions(): Promise<Faction[]>` — `if (!db) return []`, then `query(collection(db, FACTIONS_COLLECTION), orderBy('order'))`, map docs to `{ id: doc.id, ...doc.data() } as Faction`.
2. No `create`/`update`/`delete` functions needed — this is read-only reference data for this pass (see spec.md Key Entities: "not user-editable").

**Files**: `src/models/repositories/FactionRepository.ts` (new, ~20 lines)
**Validation**: `npm run type-check` passes; matches `CampaignRepository.ts`'s style (plain async functions, no class).

### Subtask T003: Seed data and admin upload script

**Purpose**: Get the 8 factions into Firestore via the existing admin-seed pattern.

**Steps**:
1. Create `scripts/data/factions.json` — an array of 8 objects matching the `Faction` shape (`order` 0–7), content transcribed faithfully from `legacy-reference/index.html`:
   - Order 0: Téméraires (⚔, badge "Alliance active", accent `#D4A843`, 4 facts: Structure/Objectif/Statut/Base)
   - Order 1: Rose Noire (🌹, badge "Hostile", accent `#C0392B`, 4 facts: Type/Origine/Objectif/Menace)
   - Order 2: Ordre du Savoir (📚, badge "Neutre / Ambigu", accent `#2A5FA8`, 4 facts: Rôle/Membres/Stance/Rapport)
   - Order 3: Paysans (🌾, badge "Caste basse", accent `#4A7A28`, 2 facts: Rôle/Rapport aux Téméraires)
   - Order 4: Nobles (🏰, badge "Divisés", accent `#6A4ABA`, 2 facts: Faction A/Faction B)
   - Order 5: Marchands (💰, badge "Opportunistes", accent `#A07020`, 2 facts: Structure/Rapport)
   - Order 6: Fonctionnaires (📜, badge "Caste administrative", accent `#1A6A5A`, 2 facts: Rôle/Secret)
   - Order 7: Religieux (🙏, badge "Influents", accent `#7A1A5A`, 2 facts: Principales factions/Rapport)
   Pull exact title/subtitle/description/fact text from the legacy file — don't summarize or invent.
2. Extend `scripts/uploadStaticDataAdmin.mjs`: alongside the existing races/classes upload loop, read `scripts/data/factions.json` and upload each entry to the `factions` collection using a slugified title as the doc id (same slugify approach already used for races/classes in that file).

**Files**: `scripts/data/factions.json` (new, ~90 lines), `scripts/uploadStaticDataAdmin.mjs` (modified, +~15 lines)
**Validation**: `node scripts/uploadStaticDataAdmin.mjs` runs without error against a real service account (manual check, not part of CI); JSON parses and matches the `Faction` shape.

### Subtask T004: `FactionBrowserView.vue`

**Purpose**: The tabbed browser itself.

**Steps**:
1. Create `src/views/FactionBrowserView.vue` using `RaceCarouselView.vue`'s data-loading shape: `campaignId` from route (used only for `CampaignShell`, factions aren't campaign-scoped), `factions`/`loading`/`error` refs, `onMounted` calls `listFactions()`.
2. Add `activeIndex = ref(0)` (FR-004: defaults to the first tab).
3. Template: wrap in `<CampaignShell :campaign-id="campaignId">`. Render a tab row (one button per faction, `class="active"` when `index === activeIndex`, click sets `activeIndex`) followed by the active faction's card: title, subtitle, badge, description paragraph, facts grid (`v-for` over `facts`, 2–4 cells — do not hardcode 4).
4. Tab row must wrap or scroll on narrow viewports (NFR-002) — reuse the `@media (max-width: 900px)` breakpoint pattern from `CampaignShell.vue`, e.g. `flex-wrap: wrap` on the tabs container.
5. Keep French copy and loading/error message tone consistent with `RaceCarouselView.vue` (e.g. `"Chargement des factions..."`, `"Aucune faction disponible."`).

**Files**: `src/views/FactionBrowserView.vue` (new, ~150 lines incl. scoped styles)
**Validation**: `npm run type-check` and `npm run lint` pass; manually verified in-browser (see Definition of Done).

### Subtask T005: Route and sidebar entry

**Purpose**: Make the view reachable (FR-003).

**Steps**:
1. In `src/router/index.ts`, add a route alongside the existing `race-carousel`/`class-carousel` routes: `path: '/campaigns/:id/castes'`, `name: 'castes'`, lazy `component: () => import('../views/FactionBrowserView.vue')`, `meta: { requiresAuth: true }`.
2. In `src/components/layout/CampaignShell.vue`, add a `RouterLink` to the `sidebar-links` group (next to Univers/Races/Classes): `to="/campaigns/${props.campaignId}/castes"`, label `"Castes"`.

**Files**: `src/router/index.ts` (modified, +6 lines), `src/components/layout/CampaignShell.vue` (modified, +3 lines)
**Validation**: Clicking "Castes" in the sidebar from any campaign page lands on the new view (manual check).

### Subtask T006: Unit test for tab-switching

**Purpose**: Cover FR-001/SC-003 — verify switching tabs actually changes displayed content.

**Steps**:
1. Create `src/views/__tests__/FactionBrowserView.spec.ts` following `AppShell.spec.ts`'s mocking style: `vi.mock` `vue-router`'s `useRoute` (return a fixed `campaignId` param) and `vi.mock` `FactionRepository`'s `listFactions` to resolve a small fixture (2–3 factions with distinct titles).
2. Test: mount, wait for the mocked data to resolve, assert the first faction's title is shown; click the second tab; assert the second faction's title is now shown and the first is not.

**Files**: `src/views/__tests__/FactionBrowserView.spec.ts` (new, ~40 lines)
**Validation**: `npm run test:unit` passes, including this new test.

### Subtask T007: E2e test for the castes route's auth guard

**Purpose**: Charter Quality Gates require e2e coverage for any change touching routing or a full view (this WP adds both). Cover what's actually achievable given current test infrastructure.

**Context — read before writing this test**: every `/campaigns/*` route (including the new castes route) has `meta: { requiresAuth: true }`, and `e2e/vue.spec.ts` is the *only* existing e2e test — it only covers the unauthenticated root/login page. There is no test-auth fixture (no way to reach an authenticated session) anywhere in this e2e suite yet. Building one is a real, separate undertaking (a test Firebase project + programmatic sign-in, or an auth-state mock) — out of scope for this WP. Don't invent one here.

**Steps**:
1. Create `e2e/castes.spec.ts` following `e2e/vue.spec.ts`'s style (`import { test, expect } from '@playwright/test'`, no custom fixtures).
2. Test: `page.goto('/campaigns/some-campaign-id/castes')` while unauthenticated (default Playwright state — no session), then assert the router's `requiresAuth` guard redirected to the login view — e.g. `await expect(page).toHaveURL(/\/$|\/jdr-app\/$/)` and/or `await expect(page.locator('h1')).toHaveText('La Tour des Sorciers')`, matching what `e2e/vue.spec.ts` already asserts for the root.
3. This intentionally does **not** verify faction content renders — that needs an authenticated session, which no test in this suite can do yet. Say so in a one-line code comment so the next person doesn't assume more coverage exists than actually does.

**Files**: `e2e/castes.spec.ts` (new, ~15 lines)
**Validation**: `CI=1 npx playwright test --project=chromium e2e/castes.spec.ts` passes (needs a prior `npm run build`, same as verifying `e2e/vue.spec.ts` — see this repo's `/run` skill or `playwright.config.ts`'s `webServer` block for the headless-environment setup).

## Definition of Done

- [ ] `Faction`/`FactionFact` types exist and match the data shape used by the repository, seed data, and view
- [ ] `FactionRepository.listFactions()` follows the `if (!db)` fallback + `{ id: doc.id, ...doc.data() }` pattern
- [ ] `scripts/data/factions.json` has all 8 factions with content matching `legacy-reference/index.html`
- [ ] `scripts/uploadStaticDataAdmin.mjs` uploads factions alongside races/classes
- [ ] `FactionBrowserView.vue` renders tabs, defaults to the first faction, switches on click, handles 2–4 fact cells without breaking layout
- [ ] Route + sidebar link both work end-to-end
- [ ] New unit test passes; `npm run type-check`, `npm run lint`, `npm run test:unit` all pass
- [ ] New e2e test (`e2e/castes.spec.ts`) passes, covering the route's auth guard
- [ ] Manually verified in a browser (dev server + real or seeded Firestore data)

## Risks

- **Content transcription errors**: French copy is easy to mistype or paraphrase by accident. Cross-check each fiche against the legacy file line-by-line before finalizing `factions.json`, don't work from memory of this prompt's summary.
- **Firestore security rules**: if rules are locked down to authenticated campaign members only, a public `factions` collection read might need a rules change outside this WP's `owned_files`. Flag to reviewer if `listFactions()` returns empty despite seeded data and no console errors — likely a rules issue, not a code bug.
- **Tab a11y**: legacy version used `onclick` divs, not real buttons. This port should use real `<button>` elements for keyboard/screen-reader accessibility — a deliberate improvement over the legacy source, not a fidelity requirement (C-003 covers content, not markup).

## Reviewer Guidance

- Compare `factions.json` content against `legacy-reference/index.html` directly, faction by faction — this is the easiest place for silent drift to creep in.
- Confirm the repository has no campaign-scoping (`where('campaignId', ...)`) — factions are intentionally global, unlike races/classes' per-campaign query pattern; don't let this WP accidentally copy that filter.
- Check the 2-fact vs 4-fact factions both render cleanly — this is the one layout edge case called out in spec.md.

Implementation command: `spec-kitty agent action implement WP01 --agent claude`

## Activity Log

- 2026-07-12T18:42:09Z – claude – shell_pid=18091 – Assigned agent via action command
- 2026-07-12T18:55:24Z – claude – shell_pid=18091 – Implemented, all gates green: type-check/lint/unit/e2e pass. Manual browser verification of real Firestore-seeded content still needs an authenticated session — flagging to the human before I run the production seed script.
- 2026-07-12T19:34:21Z – claude – shell_pid=26930 – Started review via action command
- 2026-07-12T19:39:52Z – user – shell_pid=26930 – Review passed. Verified fresh: type-check, lint, full unit suite (4/4), build, e2e (2/2) all green under Node 22. Anti-pattern checklist: no dead code (listFactions/FactionBrowserView both have live callers), no throws in new production code, no frozen-file or MUST-NOT violations, no shared-file ownership conflicts (only WP in this mission). Found and fixed one real gap: the unit test's mock fixtures both used facts:[], so FR-002's badge/description/facts-grid — including the 2-vs-4-cell edge case spec.md and this WP's own reviewer guidance call out explicitly — had zero assertions. Strengthened the test to cover both cell counts (commit 0ed985e). NFR-001/NFR-002 remain without dedicated tests, consistent with the analysis gate's prior accepted MEDIUM finding (A2) - not re-litigated here.
