import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Race } from '../types/Race'

const RACES_COLLECTION = 'races'

function mapRace(docSnap: { id: string; data: () => Record<string, unknown> }): Race {
  return { id: docSnap.id, ...docSnap.data() } as Race
}

function getCampaignRacesCollection(campaignId: string) {
  if (!db) {
    throw new Error('Firebase non configuré')
  }

  return collection(db, 'Campaigns', campaignId, 'Races')
}

export async function listRacesByCampaign(campaignId: string): Promise<Race[]> {
  if (!db) return []

  const nestedSnapshot = await getDocs(getCampaignRacesCollection(campaignId))
  if (!nestedSnapshot.empty) {
    return nestedSnapshot.docs.map((docSnap) => mapRace(docSnap))
  }

  const byCampaignIdQuery = query(
    collection(db, RACES_COLLECTION),
    where('campaignId', '==', campaignId),
  )
  const byCampaignIdSnapshot = await getDocs(byCampaignIdQuery)
  if (!byCampaignIdSnapshot.empty) {
    return byCampaignIdSnapshot.docs.map((docSnap) => mapRace(docSnap))
  }

  const byCampaignTagsQuery = query(
    collection(db, RACES_COLLECTION),
    where('campaignTags', 'array-contains', campaignId),
  )
  const byCampaignTagsSnapshot = await getDocs(byCampaignTagsQuery)
  return byCampaignTagsSnapshot.docs.map((docSnap) => mapRace(docSnap))
}
