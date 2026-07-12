import { collection, getDocs, orderBy, query } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Faction } from '../types/Faction'

const FACTIONS_COLLECTION = 'factions'

export async function listFactions(): Promise<Faction[]> {
  if (!db) {
    return []
  }

  const factionsQuery = query(collection(db, FACTIONS_COLLECTION), orderBy('order'))
  const snapshot = await getDocs(factionsQuery)

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Faction)
}
