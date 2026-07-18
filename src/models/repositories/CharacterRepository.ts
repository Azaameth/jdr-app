import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CharacterProfile } from '../types/Character'

const CHARACTERS_COLLECTION = 'characters'

export async function listCharactersByCampaign(campaignId: string): Promise<CharacterProfile[]> {
  if (!db) {
    return []
  }

  const charactersQuery = query(
    collection(db, CHARACTERS_COLLECTION),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(charactersQuery)

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CharacterProfile)
}

export async function getCharacterById(id: string): Promise<CharacterProfile | null> {
  if (!db) return null
  const ref = doc(db, CHARACTERS_COLLECTION, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as CharacterProfile
}

export async function listChildrenOf(
  campaignId: string,
  parentCharacterId: string,
): Promise<CharacterProfile[]> {
  if (!db) return []

  const childrenQuery = query(
    collection(db, CHARACTERS_COLLECTION),
    where('campaignId', '==', campaignId),
    where('parentCharacterId', '==', parentCharacterId),
  )
  const snapshot = await getDocs(childrenQuery)

  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as CharacterProfile)
}

export async function updateCharacter(
  id: string,
  fields: Partial<CharacterProfile>,
): Promise<void> {
  if (!db) return
  const payload: Partial<CharacterProfile> = { ...fields }
  delete payload.id
  const ref = doc(db, CHARACTERS_COLLECTION, id)
  await updateDoc(ref, { ...payload, updatedAt: new Date().toISOString() })
}
