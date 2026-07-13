import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Class } from '../types/Class'

const CLASSES_COLLECTION = 'classes'

export async function listClassesByCampaign(campaignId: string): Promise<Class[]> {
  if (!db) return []

  // Prefer the current schema (campaignId), then fall back to legacy campaignTags.
  const byCampaignIdQuery = query(collection(db, CLASSES_COLLECTION), where('campaignId', '==', campaignId))
  const byCampaignIdSnapshot = await getDocs(byCampaignIdQuery)
  if (!byCampaignIdSnapshot.empty) {
    return byCampaignIdSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Class)
  }

  const byCampaignTagsQuery = query(
    collection(db, CLASSES_COLLECTION),
    where('campaignTags', 'array-contains', campaignId),
  )
  const byCampaignTagsSnapshot = await getDocs(byCampaignTagsQuery)
  return byCampaignTagsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Class)
}
