import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '../../firebase/config'

export interface GearEntry {
  EntryId: string
  DisplayName: string
  Description?: string
  BonusRaw?: Record<string, number>
  BonusConditional?: Array<{ Name: string; Effects: Record<string, number> }>
}

export interface BagItemDocument extends GearEntry {
  Quantity: number
  PlayerId: string
  CampaignId: string
  UpdatedAt?: string
}

function getBagItemRef(campaignId: string, characterId: string, itemId: string) {
  if (!db) return null
  return doc(db, 'Campaigns', campaignId, 'Characters', characterId, 'Items', itemId)
}

function getBagCollectionRef(campaignId: string, characterId: string) {
  if (!db) return null
  return collection(db, 'Campaigns', campaignId, 'Characters', characterId, 'Items')
}

export async function getBagItemById(
  campaignId: string,
  characterId: string,
  itemId: string,
): Promise<BagItemDocument | null> {
  if (!db) return null

  const ref = getBagItemRef(campaignId, characterId, itemId)
  if (!ref) return null

  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null

  return { id: snapshot.id, ...snapshot.data() } as BagItemDocument & { id: string }
}

export async function listBagItemsByCharacter(
  campaignId: string,
  characterId: string,
): Promise<BagItemDocument[]> {
  if (!db) return []

  const ref = getBagCollectionRef(campaignId, characterId)
  if (!ref) return []

  const snapshot = await getDocs(ref)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as BagItemDocument & { id: string }))
}

export async function setBagItem(
  campaignId: string,
  characterId: string,
  itemId: string,
  item: Partial<BagItemDocument>,
): Promise<void> {
  if (!db) return

  const ref = getBagItemRef(campaignId, characterId, itemId)
  if (!ref) return

  await setDoc(ref, { ...item, UpdatedAt: new Date().toISOString() }, { merge: true })
}

export async function updateBagItem(
  campaignId: string,
  characterId: string,
  itemId: string,
  item: Partial<BagItemDocument>,
): Promise<void> {
  if (!db) return

  const ref = getBagItemRef(campaignId, characterId, itemId)
  if (!ref) return

  await updateDoc(ref, { ...item, UpdatedAt: new Date().toISOString() })
}

export async function deleteBagItem(
  campaignId: string,
  characterId: string,
  itemId: string,
): Promise<void> {
  if (!db) return

  const ref = getBagItemRef(campaignId, characterId, itemId)
  if (!ref) return

  await deleteDoc(ref)
}

export function subscribeBagItemsByCharacter(
  campaignId: string,
  characterId: string,
  onChange: (items: BagItemDocument[]) => void,
): Unsubscribe {
  if (!db) return () => {}

  const ref = getBagCollectionRef(campaignId, characterId)
  if (!ref) return () => {}

  return onSnapshot(ref, (snapshot) => {
    onChange(
      snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as BagItemDocument & { id: string }),
      ),
    )
  })
}
