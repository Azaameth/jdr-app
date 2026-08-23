import { doc, getDoc, onSnapshot, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore'

import { db } from '../../firebase/config'

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
