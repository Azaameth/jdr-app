import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Class } from '../types/Class'

const CLASSES_COLLECTION = 'classes'

function mapClass(docSnap: { id: string; data: () => Record<string, unknown> }): Class {
  return { id: docSnap.id, ...docSnap.data() } as Class
}

function getCampaignClassesCollection(campaignId: string) {
  if (!db) {
    throw new Error('Firebase non configuré')
  }

  return collection(db, 'Campaigns', campaignId, 'Classes')
}

export async function listClassesByCampaign(campaignId: string): Promise<Class[]> {
  if (!db) return []

  const nestedSnapshot = await getDocs(getCampaignClassesCollection(campaignId))
  if (!nestedSnapshot.empty) {
    return nestedSnapshot.docs.map((docSnap) => mapClass(docSnap))
  }

  const byCampaignIdQuery = query(
    collection(db, CLASSES_COLLECTION),
    where('campaignId', '==', campaignId),
  )
  const byCampaignIdSnapshot = await getDocs(byCampaignIdQuery)
  if (!byCampaignIdSnapshot.empty) {
    return byCampaignIdSnapshot.docs.map((docSnap) => mapClass(docSnap))
  }

  const byCampaignTagsQuery = query(
    collection(db, CLASSES_COLLECTION),
    where('campaignTags', 'array-contains', campaignId),
  )
  const byCampaignTagsSnapshot = await getDocs(byCampaignTagsQuery)
  return byCampaignTagsSnapshot.docs.map((docSnap) => mapClass(docSnap))
}
