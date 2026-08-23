import { collection, getDocs } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Class } from '../types/Class'

function mapClass(docSnap: { id: string; data: () => Record<string, unknown> }): Class {
  const raw = docSnap.data()
  return {
    id: docSnap.id,
    DisplayName: String(raw.DisplayName ?? docSnap.id),
    Description: String(raw.Description ?? ''),
    PictureUrl: String(raw.PictureUrl ?? ''),
    Bonuses: (raw.Bonuses as Record<string, number>) ?? {},
    Traits: (raw.Traits as Class['Traits']) ?? {},
    StatConstraints: (raw.StatConstraints as Class['StatConstraints']) ?? {},
    HealthNote: String(raw.HealthNote ?? ''),
    ManaNote: String(raw.ManaNote ?? ''),
    ArmorNote: String(raw.ArmorNote ?? ''),
  }
}

function getCampaignClassesCollection(campaignId: string) {
  if (!db) {
    throw new Error('Firebase non configuré')
  }

  return collection(db, 'Campaigns', campaignId, 'Classes')
}

export async function listClassesByCampaign(campaignId: string): Promise<Class[]> {
  if (!db) return []

  const snapshot = await getDocs(getCampaignClassesCollection(campaignId))
  return snapshot.docs.map((docSnap) => mapClass(docSnap))
}
