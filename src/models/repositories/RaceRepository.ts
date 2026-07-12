import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Race } from '../types/Race'

const RACES_COLLECTION = 'races'

export async function listRacesByCampaign(campaignId: string): Promise<Race[]> {
  if (!db) return []
  const racesQuery = query(
    collection(db, RACES_COLLECTION),
    where('campaignTags', 'array-contains', campaignId),
  )
  const snapshot = await getDocs(racesQuery)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Race)
}
