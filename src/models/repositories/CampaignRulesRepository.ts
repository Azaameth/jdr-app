import { doc, getDoc } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CampaignRulesDocument } from '../types/RpgDataModel'

export async function getCampaignRules(campaignId: string): Promise<CampaignRulesDocument | null> {
  if (!db) return null

  const ref = doc(db, 'Campaigns', campaignId, 'CampaignRules', 'Main')
  const snapshot = await getDoc(ref)

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data() as Record<string, unknown>
  return data as unknown as CampaignRulesDocument
}

export async function setCampaignRules(
  campaignId: string,
  input: Partial<CampaignRulesDocument>,
): Promise<void> {
  if (!db) return

  const ref = doc(db, 'Campaigns', campaignId, 'CampaignRules', 'Main')
  await getDoc(ref)
  // The app currently only needs the read path for the RFC-first refactor.
  // Firestore write support remains intentionally deferred until the rest of the schema is stable.
  void ref
  void input
}
