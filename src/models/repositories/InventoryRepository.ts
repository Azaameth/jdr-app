import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CharacterInventory, InventoryItem } from '../types/Inventory'

const INVENTORIES_COLLECTION = 'inventories'

function mapInventory(raw: Record<string, unknown>): CharacterInventory {
  return {
    uid: String(raw.uid ?? ''),
    campaignId: String(raw.campaignId ?? ''),
    characterId: String(raw.characterId ?? ''),
    items: Array.isArray(raw.items) ? (raw.items as InventoryItem[]) : [],
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
  return first ? mapInventory(first.data()) : null
}
