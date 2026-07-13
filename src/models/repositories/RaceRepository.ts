import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Race } from '../types/Race'

const RACES_COLLECTION = 'races'

export async function listRacesByCampaign(campaignId: string): Promise<Race[]> {
  if (!db) return []

  // Prefer the current schema (campaignId), then fall back to legacy campaignTags.
  const byCampaignIdQuery = query(collection(db, RACES_COLLECTION), where('campaignId', '==', campaignId))
  const byCampaignIdSnapshot = await getDocs(byCampaignIdQuery)
  if (!byCampaignIdSnapshot.empty) {
    return byCampaignIdSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Race)
  }

  const byCampaignTagsQuery = query(
    collection(db, RACES_COLLECTION),
    where('campaignTags', 'array-contains', campaignId),
  )
  const byCampaignTagsSnapshot = await getDocs(byCampaignTagsQuery)
  return byCampaignTagsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Race)
}
