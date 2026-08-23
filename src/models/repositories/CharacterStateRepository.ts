import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { InjuryState, Posture, SecondaryAttributeName } from '../types/Participant'

export interface CharacterStateDocument {
  Health: number
  HealthCurrent: number
  Mana: number
  ManaCurrent: number
  PhysicalArmor?: number
  PhysicalArmorCurrent?: number
  MagicalArmor?: number
  MagicalArmorCurrent?: number
  PhysicalAttack?: number
  MagicalAttack?: number
  PhysicalDefense?: number
  MagicalDefense?: number
  // Extensions beyond docs/rpg-data-model.md §4.8 — no equivalent exists there
  // for these (party/table-only, no combat-automation angle); see NEXTSTEPS.md
  // Cluster 3b for the decision to add them here rather than invent a new doc.
  Posture?: Posture
  // Key present ⇔ that sub-caractéristique is jaune/rouge; absent = saine.
  Injuries?: Partial<Record<SecondaryAttributeName, InjuryState>>
  // Both may be true simultaneously (spec FR-008). Absent = false.
  Advantage?: boolean
  Disadvantage?: boolean
  PlayerId: string
  CampaignId: string
  UpdatedAt?: string
}

function getCharacterStateRef(campaignId: string, characterId: string) {
  if (!db) return null
  return doc(db, 'Campaigns', campaignId, 'Characters', characterId, 'States', 'Current')
}

export async function getCharacterState(
  campaignId: string,
  characterId: string,
): Promise<CharacterStateDocument | null> {
  if (!db) return null

  const ref = getCharacterStateRef(campaignId, characterId)
  if (!ref) return null
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null

  return { id: snapshot.id, ...snapshot.data() } as CharacterStateDocument & { id: string }
}

export async function setCharacterState(
  campaignId: string,
  characterId: string,
  state: Partial<CharacterStateDocument>,
): Promise<void> {
  if (!db) return

  const ref = getCharacterStateRef(campaignId, characterId)
  if (!ref) return
  const payload = {
    ...state,
    UpdatedAt: new Date().toISOString(),
  }

  await setDoc(ref, payload, { merge: true })
}

export async function updateCharacterState(
  campaignId: string,
  characterId: string,
  state: Partial<CharacterStateDocument>,
): Promise<void> {
  if (!db) return

  const ref = getCharacterStateRef(campaignId, characterId)
  if (!ref) return
  const payload = {
    ...state,
    UpdatedAt: new Date().toISOString(),
  }

  await updateDoc(ref, payload)
}

export function subscribeCharacterState(
  campaignId: string,
  characterId: string,
  onChange: (state: CharacterStateDocument | null) => void,
): Unsubscribe {
  if (!db) return () => {}

  const ref = getCharacterStateRef(campaignId, characterId)
  if (!ref) return () => {}

  return onSnapshot(ref, (snapshot) => {
    onChange(
      snapshot.exists()
        ? ({ id: snapshot.id, ...snapshot.data() } as CharacterStateDocument & { id: string })
        : null,
    )
  })
}

// Resets HealthCurrent/ManaCurrent to their materialized max for every given
// character's States/Current doc — replaces the old flat-Participants-based
// resetTeamSessionToMax (NEXTSTEPS.md Cluster 3b). Matches its prior scope
// exactly: caller passes only non-child (playable) character ids, so
// transformations are left untouched, same as before. Missing docs are
// skipped rather than created — a character with no live state yet has
// nothing to reset.
export async function resetTeamStatesToMax(
  campaignId: string,
  characterIds: string[],
): Promise<number> {
  if (!db) return 0
  if (characterIds.length === 0) return 0

  const now = new Date().toISOString()
  const refs = characterIds
    .map((characterId) => getCharacterStateRef(campaignId, characterId))
    .filter((ref): ref is NonNullable<typeof ref> => ref !== null)

  const snapshots = await Promise.all(refs.map((ref) => getDoc(ref)))
  const batch = writeBatch(db)
  let count = 0

  snapshots.forEach((snapshot, index) => {
    if (!snapshot.exists()) return
    const data = snapshot.data() as CharacterStateDocument
    const ref = refs[index]
    if (!ref) return
    batch.update(ref, {
      HealthCurrent: data.Health,
      ManaCurrent: data.Mana,
      UpdatedAt: now,
    })
    count += 1
  })

  await batch.commit()
  return count
}
