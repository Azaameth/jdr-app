import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Class } from '../types/Class'

const CLASSES_COLLECTION = 'classes'

export async function listClassesByCampaign(campaignId: string): Promise<Class[]> {
  if (!db) return []
  const classesQuery = query(
    collection(db, CLASSES_COLLECTION),
    where('campaignTags', 'array-contains', campaignId),
  )
  const snapshot = await getDocs(classesQuery)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Class)
}
