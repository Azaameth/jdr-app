---
work_package_id: WP01
title: 'Contract: types, data access, rules, seeds'
dependencies: []
requirement_refs:
- FR-014
- FR-015
- FR-018
tracker_refs: []
planning_base_branch: feat/vitruve-character-sheet
merge_target_branch: feat/vitruve-character-sheet
branch_strategy: Planning artifacts for this mission were generated on feat/vitruve-character-sheet. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/vitruve-character-sheet unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
- T007
- T008
agent: claude
history:
- 2026-07-18T07:12:04Z — created by /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: src/models/
create_intent:
- src/models/types/CampaignSession.ts
- src/models/repositories/CampaignSessionRepository.ts
- src/controllers/useCampaignSessionStore.ts
execution_mode: code_change
model: claude-sonnet-5
owned_files:
- src/models/types/Character.ts
- src/models/types/Participant.ts
- src/models/types/CampaignSession.ts
- src/models/repositories/ParticipantRepository.ts
- src/models/repositories/CharacterRepository.ts
- src/models/repositories/CampaignSessionRepository.ts
- src/models/repositories/__tests__/**
- src/controllers/usePlayerStore.ts
- src/controllers/useCampaignSessionStore.ts
- src/controllers/__tests__/**
- firestore.rules
- scripts/**
- CLAUDE.md
role: implementer
tags: []
---

# WP01 — Contract: types, data access, rules, seeds

## ⚡ Do This First: Load Agent Profile

Before reading further, load your assigned agent profile:

```
/ad-hoc-profile-load implementer-ivan
```

Adopt its identity, boundaries, and initialization declaration, then return here.

## Objective

Materialize the mission's **locked Schema Contract** end-to-end with **zero UI change**: extended type modules, repository functions (including the codebase's *first* Firestore `onSnapshot` subscribe pattern), store extensions, Firestore security rules, and seed data for the Furmiaou child character. When you finish, `npm run type-check && npm run lint && npm run test:unit` all pass and the running app renders exactly as before.

Every name in this WP is contractual. Do not rename anything. The authoritative references are:

- `kitty-specs/vitruve-character-sheet-01KXSZRT/spec.md` → "Schema Contract (locked)"
- `kitty-specs/vitruve-character-sheet-01KXSZRT/contracts/session-state-api.md` → function signatures + rules matrix
- `kitty-specs/vitruve-character-sheet-01KXSZRT/data-model.md` → invariants and validation rules

## Context

- Stores are hand-rolled singleton composables (module-scope `ref`/`computed` + factory returning computeds and async methods) — copy the shape of `src/controllers/useCampaignStore.ts`. Pinia is not used.
- Repositories are plain async functions, one file per collection. Every function starts with `if (!db) return <fallback>` so GitHub Pages builds without Firebase secrets stay read-only but functional. Docs map via `{ id: doc.id, ...doc.data() }` — never a blind cast.
- Error handling in stores: `error.value = err instanceof Error ? err.message : '<French fallback>'` on every catch.
- There is **no `onSnapshot` anywhere in `src/` today**. You are introducing the convention (research.md D-01): repository-level `subscribe*` functions that return the Firebase `Unsubscribe` handle, and return a no-op `() => {}` without ever invoking the callback when `!db`.

## Subtasks

### T001 — Extend type modules; add `CampaignSession.ts`

**Files**: `src/models/types/Character.ts`, `src/models/types/Participant.ts`, `src/models/types/CampaignSession.ts` (new)

1. `Character.ts`: add to `CharacterProfile`:
   ```ts
   parentCharacterId?: string
   ```
   Doc comment: present ⇔ the character is a child (transformation, e.g. Furmiaou); children are full profiles in the same collection; depth is 1 (children have no children — enforced by tooling, not types).
2. `Participant.ts`: add and export:
   ```ts
   export type InjuryState = 'jaune' | 'rouge'
   export type SecondaryAttributeName = 'puissance' | 'finesse' | 'aura' | 'relation' | 'instinct' | 'savoir'
   ```
   Extend `CharacterSessionState` with:
   ```ts
   injuries?: Partial<Record<SecondaryAttributeName, InjuryState>>
   advantage?: boolean
   disadvantage?: boolean
   ```
   Extend `Participant` with:
   ```ts
   childSessions?: Record<string, CharacterSessionState>
   ```
   Absent injury key = saine ("healthy"); never store `'none'`. `childSessions` is keyed by child characterId.
3. `CampaignSession.ts` (new):
   ```ts
   export interface CampaignSessionState {
     id: string // == campaignId
     campaignId: string
     adventureDice: { aventure: number; mesaventure: number }
     updatedAt?: string
   }
   ```

**Validation**: type-check passes; no existing import breaks (all additions optional).

### T002 — `ParticipantRepository`: subscribe + session writes

**File**: `src/models/repositories/ParticipantRepository.ts`

Add exactly these functions (signatures from `contracts/session-state-api.md`):

1. `subscribeParticipantsByCampaign(campaignId, onChange): Unsubscribe`
   - `if (!db) return () => {}` — callback never fires.
   - `onSnapshot(query(collection(db,'participants'), where('campaignId','==',campaignId)), …)` mapping docs through the existing `mapParticipant` helper, then `onChange(list)`.
   - Import `Unsubscribe` type from `firebase/firestore`.
2. `updateSessionFields(participantId, fields)` — merge-write only the provided keys under `session.` using dotted field paths (`{'session.hp': …}` style via `updateDoc`/`setDoc(..., {merge:true})` consistent with how `setParticipantSessionByCharacterId` writes today — read it first and match its mechanism). Accepted keys: `hp`, `mana`, `posture`, `injuries`, `advantage`, `disadvantage`. Writing `injuries` replaces the whole map (callers pass the complete next map — simplest consistent semantics).
3. `updateChildSession(participantId, childCharacterId, fields)` — merge-write under `childSessions.<childCharacterId>.`.

**Validation**: unit tests in T008 cover `!db` fallbacks (subscribe returns noop, updates resolve without throwing).

### T003 — `CharacterRepository`: children query + character write

**File**: `src/models/repositories/CharacterRepository.ts`

1. `listChildrenOf(campaignId, parentCharacterId): Promise<CharacterProfile[]>` — query `characters` where `campaignId ==` and `parentCharacterId ==`; fallback `[]`.
2. `updateCharacter(id: string, fields: Partial<CharacterProfile>): Promise<void>` — merge write; used later by the histoire editor (WP03) and MJ raw editor (WP06). Strip `id` from the payload before writing.

**Note**: existing roster consumers (`listCharactersByCampaign` callers) are NOT changed in this WP — child filtering in rosters is WP05/WP06 UI work.

### T004 — `CampaignSessionRepository` (new)

**File**: `src/models/repositories/CampaignSessionRepository.ts`

Per contract: `getCampaignSession` (fallback `null`), `subscribeCampaignSession` (fallback noop; also call `onChange(null)` semantics are NOT required when `!db` — never call back), `adjustAdventureDice(campaignId, die, delta)`:
- Read-modify-write is unnecessary: use `setDoc(doc(db,'campaignSessions',campaignId), {...}, {merge:true})` with the clamped value computed from a fresh `getDoc` (missing doc ⇒ current value 0). Result must never go below 0 (data-model I-S3).
- Set `campaignId` and `updatedAt` (ISO string like other repos — check how existing repos write timestamps and match).

### T005 — `usePlayerStore` extensions

**File**: `src/controllers/usePlayerStore.ts`

Read the existing store first; preserve its surface. Add (contract names, exact):

- `setInjury(characterId, attr, state)` — `state: 'jaune' | 'rouge' | null` (null = saine ⇒ remove the key). Resolves participant via existing `getParticipantByCharacterId` path, computes next injuries map, calls `updateSessionFields`.
- `setAdvantage(characterId, value)` / `setDisadvantage(characterId, value)`.
- `setChildVitals(parentCharacterId, childCharacterId, fields)` → `updateChildSession`.
- `subscribeParty(campaignId)` / `unsubscribeParty()` — module-scope unsubscribe holder; idempotent attach (re-calling with the same campaign is a no-op; different campaign detaches first). Feeds a module-scope `ref` of participants.
- `party` computed: joined `{ character, session }[]` — approved participants only, joined against campaign characters, **excluding characters with `parentCharacterId`** (data-model I-C2). Character list source: fetch once via `listCharactersByCampaign` inside `subscribeParty` (a one-shot roster read is fine; only sessions need live updates).

French error fallbacks on every catch, matching existing tone (e.g. `'Impossible de mettre à jour l'état de session.'` — check existing strings and stay consistent).

### T006 — `useCampaignSessionStore` (new)

**File**: `src/controllers/useCampaignSessionStore.ts`

Contract surface: `adventureDice` computed (defaults `{ aventure: 0, mesaventure: 0 }` when absent — I-S1), `subscribe(campaignId)` / `unsubscribe()`, `adjust(die, delta)`, `error` computed. Singleton-composable pattern; module-scope state.

### T007 — `firestore.rules`

**File**: `firestore.rules`

Read the existing rules carefully first — extend, don't rewrite. Apply the contract matrix:

1. `campaignSessions/{campaignId}`: read for signed-in campaign members (match however campaign membership is checked elsewhere in the file — reuse existing helper functions); create/update/delete for `mj`/`admin`, with `adventureDice.aventure >= 0 && adventureDice.mesaventure >= 0` validated on write.
2. `participants/{id}`: confirm the existing owner-or-MJ write rule covers the new `session.injuries`/`advantage`/`disadvantage` and `childSessions` fields (it should if writes are field-unrestricted for owners); ensure identity fields (`uid`, `campaignId`, `characterId`, `status`) remain protected exactly as today. If the current rule already prevents identity mutation, do not touch it.
3. `characters/{id}`: allow the **owner** (`resource.data.ownerUid == request.auth.uid`) to update **only** the `backstory` field of their own character (FR-012 histoire edit); `mj`/`admin` keep their existing full write access. Use a `diff().affectedKeys()` check for the owner path.

**Validation**: rules file parses (no deploy in this mission — deployment status stays a README "Known follow-ups" item; do not attempt `firebase deploy`).

### T008 — Seeds, unit tests, CLAUDE.md note

1. **Seed** (`scripts/data/characters.json` + whichever seed script consumes it — read `scripts/seedAll.mjs` / `uploadDefaultCharsAdmin.mjs` to find the shape): add **Furmiaou** as a full character with `parentCharacterId` pointing at Firm Bintaggle's seed id, using the legacy reference stats (spec FR-018): PV 48/48, Mana 0/0, éléments `["Nature", "Transmutation"]`, primary force 65 / social 50 / mental 55, secondary puissance 5, finesse 2, aura 3, relation 2, instinct 5, savoir 1. Ensure the seed scripts pass `parentCharacterId` through (they likely spread the JSON — verify, don't assume).
2. **Unit tests** (`src/models/repositories/__tests__/`, `src/controllers/__tests__/`): cover at minimum — `!db` fallbacks for every new repository function (subscribe returns a callable noop; list/get return `[]`/`null`); `setInjury` map computation (add jaune, upgrade to rouge, clear to saine removes key); `party` excludes characters with `parentCharacterId`; `adventureDice` defaults to 0/0; `adjust` clamps at 0. Mock the repository layer in store tests the way existing store tests do — read one first.
3. **CLAUDE.md**: add one line to the Conventions section documenting the repository `subscribe*` pattern (returns `Unsubscribe`, noop + never-calls-back when `!db`, stores own listener lifecycle) — DIR-002.

## Branch Strategy

Planning base: `feat/vitruve-character-sheet`. Merge target: `feat/vitruve-character-sheet` (reaches `main` via PR at mission end). Execution worktrees are allocated per computed lane from `lanes.json`; this mission is single-lane, WPs run sequentially in it. Implement with:

```
spec-kitty agent action implement WP01 --agent claude
```

## Definition of Done

- [ ] All contract names match `contracts/session-state-api.md` exactly (reviewer diffs them)
- [ ] `npm run type-check`, `npm run lint`, `npm run test:unit` green
- [ ] No file outside `owned_files` modified (this WP has zero UI diff)
- [ ] `!db` fallback verified by tests for every new repository function
- [ ] firestore.rules extended per matrix without loosening any existing rule
- [ ] Furmiaou seed present and carried by seed scripts
- [ ] CLAUDE.md subscribe-pattern note added

## Reviewer Guidance

- Diff every signature against `contracts/session-state-api.md`; contract drift here poisons five downstream WPs — reject on any rename.
- Check the rules diff line-by-line for accidental loosening (especially the owner backstory-only character write: it must not grant owners writes to attributes/skills).
- Verify `subscribeParty` cannot leak: repeated calls with the same campaign must not stack listeners.
- Confirm store catches keep the committed French-error shape.
