# Contract: Session-State & Vitruve Data Access API

**Mission**: `vitruve-character-sheet-01KXSZRT` · **Date**: 2026-07-18
No HTTP API exists (Firestore client SDK); the contract surface is the repository/store function signatures and the Firestore rules matrix. Signatures below are locked alongside the spec's Schema Contract.

## Repositories

All functions keep the committed guards: `if (!db) return <fallback>`; doc mapping `{ id: doc.id, ...doc.data() }`. `Unsubscribe = () => void`; subscribe functions return a no-op and never call back when `!db`.

### `src/models/repositories/ParticipantRepository.ts` (extended)

```ts
// existing functions unchanged: listParticipantsByCampaign, getParticipant,
// getParticipantByCharacterId, setParticipantSessionByCharacterId, resetTeamSessionToMax

export function subscribeParticipantsByCampaign(
  campaignId: string,
  onChange: (participants: Participant[]) => void,
): Unsubscribe // fallback: () => {}

export async function updateSessionFields(
  participantId: string,
  fields: Partial<Pick<CharacterSessionState, 'hp' | 'mana' | 'posture' | 'injuries' | 'advantage' | 'disadvantage'>>,
): Promise<void> // merge write into session.*

export async function updateChildSession(
  participantId: string,
  childCharacterId: string,
  fields: Partial<CharacterSessionState>,
): Promise<void> // merge write into childSessions.<childCharacterId>.*
```

### `src/models/repositories/CharacterRepository.ts` (extended)

```ts
// existing functions unchanged; listCharactersByCampaign gains no signature change
// but roster consumers must filter parentCharacterId == null (I-C2)

export async function listChildrenOf(
  campaignId: string,
  parentCharacterId: string,
): Promise<CharacterProfile[]> // fallback: []
```

### `src/models/repositories/CampaignSessionRepository.ts` (new)

```ts
export async function getCampaignSession(campaignId: string): Promise<CampaignSessionState | null> // fallback: null

export function subscribeCampaignSession(
  campaignId: string,
  onChange: (state: CampaignSessionState | null) => void,
): Unsubscribe // fallback: () => {}

export async function adjustAdventureDice(
  campaignId: string,
  die: 'aventure' | 'mesaventure',
  delta: number,
): Promise<void> // merge write, clamps result >= 0, creates doc if absent (I-S1)
```

## Stores (singleton composables, DIR-003)

### `src/controllers/usePlayerStore.ts` (extended)

```ts
// additions to the returned API — existing surface preserved
setInjury(characterId: string, attr: SecondaryAttributeName, state: 'jaune' | 'rouge' | null): Promise<void>
setAdvantage(characterId: string, value: boolean): Promise<void>
setDisadvantage(characterId: string, value: boolean): Promise<void>
setChildVitals(parentCharacterId: string, childCharacterId: string, fields: Partial<CharacterSessionState>): Promise<void>
subscribeParty(campaignId: string): void      // idempotent attach (état du groupe)
unsubscribeParty(): void
party: ComputedRef<Array<{ character: CharacterProfile; session: CharacterSessionState }>> // approved, parents only (I-C2)
```

Error handling: every catch keeps the committed shape `error.value = err instanceof Error ? err.message : '<French fallback>'`.

### `src/controllers/useCampaignSessionStore.ts` (new)

```ts
adventureDice: ComputedRef<{ aventure: number; mesaventure: number }> // {0,0} when absent (I-S1)
subscribe(campaignId: string): void
unsubscribe(): void
adjust(die: 'aventure' | 'mesaventure', delta: number): Promise<void> // mj/admin only (UI-gated + rules)
error: ComputedRef<string>
```

## Firestore rules matrix (`firestore.rules` additions)

| Path | read | create/update | delete |
|---|---|---|---|
| `participants/{id}` — `session.*`, `childSessions.*` | campaign members (existing) | owner (`request.auth.uid == resource.data.uid`) OR role `mj`/`admin`; identity fields (`uid`, `campaignId`, `characterId`, `status`) must be unchanged | existing policy (unchanged) |
| `campaignSessions/{campaignId}` | signed-in campaign members | role `mj`/`admin`; `adventureDice.aventure >= 0 && adventureDice.mesaventure >= 0` | `mj`/`admin` |
| `characters/{id}` — `parentCharacterId` | existing policy | writes via existing character-write policy (`mj`/`admin`; seed scripts use admin SDK) | existing policy |

## UI event → data contract (behavioral)

| User action | Guard (client) | Effect |
|---|---|---|
| PV/Mana ± (parent) | owner or mj/admin | `updateSessionFields(hp/mana)` — existing path preserved |
| PV ± on child tab | owner or mj/admin | `updateChildSession(childId, { hp })` |
| Injury square click | owner or mj/admin | `setInjury` cycles saine→jaune→rouge→saine |
| Avantage/Désavantage toggle | owner or mj/admin | `setAdvantage` / `setDisadvantage` |
| Dés d'aventure ± | mj/admin only | `adjustAdventureDice` (creates doc on first use) |
| Raw editor save | mj/admin only | full-doc validated write; invalid JSON ⇒ French error, no write (FR-004) |
| Calculator interactions | anyone viewing | no writes ever (display-only) |
