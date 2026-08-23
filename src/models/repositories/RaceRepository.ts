import { collection, getDocs } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Race } from '../types/Race'

function mapRace(docSnap: { id: string; data: () => Record<string, unknown> }): Race {
  const raw = docSnap.data()
  return {
    id: docSnap.id,
    DisplayName: String(raw.DisplayName ?? docSnap.id),
    Description: String(raw.Description ?? ''),
    PictureUrl: String(raw.PictureUrl ?? ''),
    Bonuses: (raw.Bonuses as Record<string, number>) ?? {},
    Traits: (raw.Traits as Race['Traits']) ?? {},
    StatConstraints: (raw.StatConstraints as Race['StatConstraints']) ?? {},
    Strengths: Array.isArray(raw.Strengths) ? (raw.Strengths as string[]) : [],
    Weaknesses: Array.isArray(raw.Weaknesses) ? (raw.Weaknesses as string[]) : [],
  }
}

function getCampaignRacesCollection(campaignId: string) {
  if (!db) {
    throw new Error('Firebase non configuré')
  }

  return collection(db, 'Campaigns', campaignId, 'Races')
}

export async function listRacesByCampaign(campaignId: string): Promise<Race[]> {
  if (!db) return []

  const snapshot = await getDocs(getCampaignRacesCollection(campaignId))
  return snapshot.docs.map((docSnap) => mapRace(docSnap))
}
