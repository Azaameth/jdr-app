import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CharacterInventory, InventoryItem, WeaponArmorItem } from '../types/Inventory'

const INVENTORIES_COLLECTION = 'inventories'

function mapInventory(id: string, raw: Record<string, unknown>): CharacterInventory {
  return {
    id,
    uid: String(raw.uid ?? ''),
    campaignId: String(raw.campaignId ?? ''),
    characterId: String(raw.characterId ?? ''),
    items: Array.isArray(raw.items) ? (raw.items as InventoryItem[]) : [],
    weapons: Array.isArray(raw.weapons) ? (raw.weapons as WeaponArmorItem[]) : [],
    armor: Array.isArray(raw.armor) ? (raw.armor as WeaponArmorItem[]) : [],
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }
}

export async function getInventoryByCharacterId(
  characterId: string,
  campaignId: string,
): Promise<CharacterInventory | null> {
  if (!db) return null
  const q = query(
    collection(db, INVENTORIES_COLLECTION),
    where('characterId', '==', characterId),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(q)
  const first = snapshot.docs[0]
  return first ? mapInventory(first.id, first.data()) : null
}

/** Replace the backpack items array (store has already validated caps). */
export async function updateInventoryItems(
  inventoryId: string,
  items: InventoryItem[],
): Promise<boolean> {
  if (!db) return false
  const inventoryRef = doc(db, INVENTORIES_COLLECTION, inventoryId)
  await updateDoc(inventoryRef, { items, updatedAt: new Date().toISOString() })
  return true
}

/** Replace weapons or armor list. kind discriminates the field written. */
export async function updateInventoryEquipment(
  inventoryId: string,
  kind: 'weapons' | 'armor',
  list: WeaponArmorItem[],
): Promise<boolean> {
  if (!db) return false
  const inventoryRef = doc(db, INVENTORIES_COLLECTION, inventoryId)
  await updateDoc(inventoryRef, { [kind]: list, updatedAt: new Date().toISOString() })
  return true
}
