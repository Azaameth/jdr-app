import { doc, getDoc, onSnapshot, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore'

import { db } from '../../firebase/config'

export interface GearEntry {
  EntryId: string
  DisplayName: string
  Description?: string
  BonusRaw?: Record<string, number>
  BonusConditional?: Array<{ Name: string; Effects: Record<string, number> }>
}

export interface CharacterEquipmentDocument {
  Armor: GearEntry[]
  Weapons: GearEntry[]
  Currency: number
  PlayerId: string
  CampaignId: string
  UpdatedAt?: string
}

function getEquipmentRef(campaignId: string, characterId: string) {
  if (!db) return null
  return doc(db, 'Campaigns', campaignId, 'Characters', characterId, 'Equipment', 'Main')
}

export async function getEquipmentByCharacter(
  campaignId: string,
  characterId: string,
): Promise<CharacterEquipmentDocument | null> {
  if (!db) return null

  const ref = getEquipmentRef(campaignId, characterId)
  if (!ref) return null

  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null

  return { id: snapshot.id, ...snapshot.data() } as CharacterEquipmentDocument & { id: string }
}

export async function setEquipmentByCharacter(
  campaignId: string,
  characterId: string,
  equipment: Partial<CharacterEquipmentDocument>,
): Promise<void> {
  if (!db) return

  const ref = getEquipmentRef(campaignId, characterId)
  if (!ref) return

  const payload = {
    ...equipment,
    UpdatedAt: new Date().toISOString(),
  }

  await setDoc(ref, payload, { merge: true })
}

export async function updateEquipmentByCharacter(
  campaignId: string,
  characterId: string,
  equipment: Partial<CharacterEquipmentDocument>,
): Promise<void> {
  if (!db) return

  const ref = getEquipmentRef(campaignId, characterId)
  if (!ref) return

  const payload = {
    ...equipment,
    UpdatedAt: new Date().toISOString(),
  }

  await updateDoc(ref, payload)
}

export function subscribeEquipmentByCharacter(
  campaignId: string,
  characterId: string,
  onChange: (equipment: CharacterEquipmentDocument | null) => void,
): Unsubscribe {
  if (!db) return () => {}

  const ref = getEquipmentRef(campaignId, characterId)
  if (!ref) return () => {}

  return onSnapshot(ref, (snapshot) => {
    onChange(
      snapshot.exists()
        ? ({ id: snapshot.id, ...snapshot.data() } as CharacterEquipmentDocument & { id: string })
        : null,
    )
  })
}
