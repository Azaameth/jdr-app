import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CharacterInventory, InventoryItem, WeaponArmorItem } from '../types/Inventory'

function getCharacterEquipmentRef(campaignId: string, characterId: string) {
  if (!db) {
    return null
  }
  return doc(db, 'Campaigns', campaignId, 'Characters', characterId, 'Equipment', 'Main')
}

function mapInventory(id: string, raw: Record<string, unknown>): CharacterInventory {
  return {
    id,
    uid: String(raw.uid ?? ''),
    campaignId: String(raw.campaignId ?? ''),
    characterId: String(raw.characterId ?? ''),
    items: Array.isArray(raw.items) ? (raw.items as InventoryItem[]) : [],
    weapons: Array.isArray(raw.weapons) ? (raw.weapons as WeaponArmorItem[]) : [],
    armor: Array.isArray(raw.armor) ? (raw.armor as WeaponArmorItem[]) : [],
    gold: typeof raw.gold === 'number' ? raw.gold : 0,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }
}

export async function getInventoryByCharacterId(
  characterId: string,
  campaignId: string,
): Promise<CharacterInventory | null> {
  if (!db) return null

  const ref = getCharacterEquipmentRef(campaignId, characterId)
  if (!ref) return null

  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null

  return mapInventory(snapshot.id, snapshot.data())
}

export async function listInventoriesByCampaign(campaignId: string): Promise<CharacterInventory[]> {
  if (!db) return []

  const charactersRef = collection(db, 'Campaigns', campaignId, 'Characters')
  const charactersSnapshot = await getDocs(charactersRef)
  const nestedInventories: CharacterInventory[] = []

  for (const characterDoc of charactersSnapshot.docs) {
    const equipmentRef = getCharacterEquipmentRef(campaignId, characterDoc.id)
    if (!equipmentRef) continue
    const equipmentSnapshot = await getDoc(equipmentRef)
    if (equipmentSnapshot.exists()) {
      nestedInventories.push(mapInventory(equipmentSnapshot.id, equipmentSnapshot.data()))
    }
  }

  return nestedInventories
}

/** Replace the backpack items array (store has already validated caps). */
export async function updateInventoryItems(
  campaignId: string,
  characterId: string,
  items: InventoryItem[],
): Promise<boolean> {
  if (!db) return false

  const inventoryRef = getCharacterEquipmentRef(campaignId, characterId)
  if (!inventoryRef) return false

  await updateDoc(inventoryRef, { items, updatedAt: new Date().toISOString() })
  return true
}

/** Replace weapons or armor list. kind discriminates the field written. */
export async function updateInventoryEquipment(
  campaignId: string,
  characterId: string,
  kind: 'weapons' | 'armor',
  list: WeaponArmorItem[],
): Promise<boolean> {
  if (!db) return false

  const inventoryRef = getCharacterEquipmentRef(campaignId, characterId)
  if (!inventoryRef) return false

  await updateDoc(inventoryRef, { [kind]: list, updatedAt: new Date().toISOString() })
  return true
}

/** Update the character's gold amount. */
export async function updateInventoryGold(
  campaignId: string,
  characterId: string,
  gold: number,
): Promise<boolean> {
  if (!db) return false

  const inventoryRef = getCharacterEquipmentRef(campaignId, characterId)
  if (!inventoryRef) return false

  await updateDoc(inventoryRef, { gold, updatedAt: new Date().toISOString() })
  return true
}
