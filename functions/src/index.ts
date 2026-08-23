// Roster/Summary materialization (docs/rpg-data-model.md §5.4 step 4, §7).
//
// Scope, deliberately narrow (NEXTSTEPS.md Cluster 7): this mirrors each
// playable character's live-state fields into one GM-dashboard doc so a
// viewer can subscribe to a single cheap document instead of the N+2 live
// reads src/views/TeamView.vue does today. It does NOT implement §5.4 steps
// 1-3 (primary/secondary statistic formulas, Class/Race Bonus folding) —
// nothing in the app produces or consumes CharacterCreation formulas or
// Statistics.Secondary yet (see NEXTSTEPS.md Cluster 6), so building that
// pipeline now would have no caller. Only the equipment BonusRaw -> base
// stat step (already done ad hoc client-side in effectiveStats.ts, Cluster 4)
// is real today, so that's the only "materialization" this function performs.
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

import { computeEffectiveStat, type GearEntry } from './effectiveStats'

initializeApp()

interface CharacterDocShape {
  ParentCharacterId: string | null
  DisplayName: string
  PlayerId: string
  ActiveFormId: string | null
  Status: string
}

interface CharacterStateDocShape {
  Health?: number
  HealthCurrent?: number
  Mana?: number
  ManaCurrent?: number
  PhysicalArmorCurrent?: number
  MagicalArmorCurrent?: number
}

interface CharacterEquipmentDocShape {
  Armor?: GearEntry[]
  Weapons?: GearEntry[]
}

// Transformations (ParentCharacterId set) are excluded — they're not their
// own roster row, mirroring TeamView.vue's `!character.parentCharacterId`
// filter. Deleting a character, or a character becoming a transformation,
// both clear any existing entry rather than leaving a stale one behind.
async function clearRosterEntry(campaignId: string, characterId: string): Promise<void> {
  const rosterRef = getFirestore().doc(`Campaigns/${campaignId}/Roster/Summary`)
  await rosterRef.set(
    { Characters: { [characterId]: FieldValue.delete() }, UpdatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  )
}

export async function materializeCharacter(campaignId: string, characterId: string): Promise<void> {
  const db = getFirestore()
  const characterSnap = await db.doc(`Campaigns/${campaignId}/Characters/${characterId}`).get()

  if (!characterSnap.exists) {
    await clearRosterEntry(campaignId, characterId)
    return
  }

  const character = characterSnap.data() as CharacterDocShape

  if (character.ParentCharacterId) {
    await clearRosterEntry(campaignId, characterId)
    return
  }

  const [stateSnap, equipmentSnap] = await Promise.all([
    db.doc(`Campaigns/${campaignId}/Characters/${characterId}/States/Current`).get(),
    db.doc(`Campaigns/${campaignId}/Characters/${characterId}/Equipment/Main`).get(),
  ])

  const state = (stateSnap.data() as CharacterStateDocShape | undefined) ?? {}
  const equipmentDoc = equipmentSnap.data() as CharacterEquipmentDocShape | undefined
  const equipment = [...(equipmentDoc?.Armor ?? []), ...(equipmentDoc?.Weapons ?? [])]

  const summary = {
    DisplayName: character.DisplayName,
    PlayerId: character.PlayerId,
    Health: computeEffectiveStat(state.Health ?? 0, equipment, 'Health'),
    HealthCurrent: state.HealthCurrent ?? 0,
    Mana: computeEffectiveStat(state.Mana ?? 0, equipment, 'Mana'),
    ManaCurrent: state.ManaCurrent ?? 0,
    PhysicalArmorCurrent: state.PhysicalArmorCurrent ?? 0,
    MagicalArmorCurrent: state.MagicalArmorCurrent ?? 0,
    ActiveFormId: character.ActiveFormId,
    Status: character.Status,
  }

  await db.doc(`Campaigns/${campaignId}/Roster/Summary`).set(
    { Characters: { [characterId]: summary }, UpdatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  )
}

export const onCharacterWritten = onDocumentWritten(
  'Campaigns/{campaignId}/Characters/{characterId}',
  (event) => materializeCharacter(event.params.campaignId, event.params.characterId),
)

export const onCharacterStateWritten = onDocumentWritten(
  'Campaigns/{campaignId}/Characters/{characterId}/States/Current',
  (event) => materializeCharacter(event.params.campaignId, event.params.characterId),
)

export const onCharacterEquipmentWritten = onDocumentWritten(
  'Campaigns/{campaignId}/Characters/{characterId}/Equipment/Main',
  (event) => materializeCharacter(event.params.campaignId, event.params.characterId),
)
