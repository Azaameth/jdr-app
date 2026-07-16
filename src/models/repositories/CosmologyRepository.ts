import { collection, getDocs, orderBy, query } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CosmologyTier } from '../types/Cosmology'

const COSMOLOGY_COLLECTION = 'cosmology'

export async function listCosmologyTiers(): Promise<CosmologyTier[]> {
  if (!db) {
    return []
  }

  const cosmologyQuery = query(collection(db, COSMOLOGY_COLLECTION), orderBy('order'))
  const snapshot = await getDocs(cosmologyQuery)

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CosmologyTier)
}
