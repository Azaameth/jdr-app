import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { BagItemDocument } from './ItemRepository'

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

/** Campaign-wide roster view (TeamView): one Equipment/Main read per character. */
export async function listEquipmentByCampaign(
  campaignId: string,
): Promise<Array<CharacterEquipmentDocument & { characterId: string }>> {
  if (!db) return []

  const charactersRef = collection(db, 'Campaigns', campaignId, 'Characters')
  const charactersSnapshot = await getDocs(charactersRef)
  const result: Array<CharacterEquipmentDocument & { characterId: string }> = []

  for (const characterDoc of charactersSnapshot.docs) {
    const equipmentDoc = await getEquipmentByCharacter(campaignId, characterDoc.id)
    if (equipmentDoc) {
      result.push({ ...equipmentDoc, characterId: characterDoc.id })
    }
  }

  return result
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

function toGearEntry(entryId: string, source: {
  DisplayName: string
  Description?: string
  BonusRaw?: Record<string, number>
  BonusConditional?: Array<{ Name: string; Effects: Record<string, number> }>
}): GearEntry {
  const entry: GearEntry = { EntryId: entryId, DisplayName: source.DisplayName }
  if (source.Description !== undefined) entry.Description = source.Description
  if (source.BonusRaw !== undefined) entry.BonusRaw = source.BonusRaw
  if (source.BonusConditional !== undefined) entry.BonusConditional = source.BonusConditional
  return entry
}

/**
 * Equipping (§5.3): a transactional move from `Items/{itemId}` into
 * `Equipment/Main`'s Armor/Weapons array, reusing the bag item's id as the
 * array entry's EntryId so re-unequipping it round-trips to the same doc id.
 */
export async function equipItem(
  campaignId: string,
  characterId: string,
  itemId: string,
  kind: 'Armor' | 'Weapons',
): Promise<void> {
  if (!db) return
  const database = db
  const equipmentRef = doc(database, 'Campaigns', campaignId, 'Characters', characterId, 'Equipment', 'Main')
  const itemRef = doc(database, 'Campaigns', campaignId, 'Characters', characterId, 'Items', itemId)

  await runTransaction(database, async (transaction) => {
    const [equipmentSnap, itemSnap] = await Promise.all([
      transaction.get(equipmentRef),
      transaction.get(itemRef),
    ])
    if (!itemSnap.exists()) return

    const item = itemSnap.data() as { DisplayName: string; Description?: string; BonusRaw?: Record<string, number>; BonusConditional?: Array<{ Name: string; Effects: Record<string, number> }> }
    const entry = toGearEntry(itemId, item)

    const existing = equipmentSnap.exists() ? (equipmentSnap.data() as CharacterEquipmentDocument) : null
    const nextList = [...(existing?.[kind] ?? []), entry]

    transaction.set(
      equipmentRef,
      { [kind]: nextList, UpdatedAt: new Date().toISOString() },
      { merge: true },
    )
    transaction.delete(itemRef)
  })
}

/**
 * Unequipping (§5.3): the inverse move, back into the bag as a
 * `BagItemDocument` with `Quantity: 1` (equipped entries carry no quantity).
 */
export async function unequipItem(
  campaignId: string,
  characterId: string,
  entryId: string,
  kind: 'Armor' | 'Weapons',
): Promise<void> {
  if (!db) return
  const database = db
  const equipmentRef = doc(database, 'Campaigns', campaignId, 'Characters', characterId, 'Equipment', 'Main')
  const itemRef = doc(database, 'Campaigns', campaignId, 'Characters', characterId, 'Items', entryId)

  await runTransaction(database, async (transaction) => {
    const equipmentSnap = await transaction.get(equipmentRef)
    if (!equipmentSnap.exists()) return

    const data = equipmentSnap.data() as CharacterEquipmentDocument
    const list = data[kind] ?? []
    const entry = list.find((candidate) => candidate.EntryId === entryId)
    if (!entry) return

    const nextList = list.filter((candidate) => candidate.EntryId !== entryId)
    transaction.set(
      equipmentRef,
      { [kind]: nextList, UpdatedAt: new Date().toISOString() },
      { merge: true },
    )

    const bagItem: BagItemDocument = {
      ...toGearEntry(entryId, entry),
      Quantity: 1,
      PlayerId: data.PlayerId,
      CampaignId: campaignId,
      UpdatedAt: new Date().toISOString(),
    }
    transaction.set(itemRef, bagItem)
  })
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
