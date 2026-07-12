import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'

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
