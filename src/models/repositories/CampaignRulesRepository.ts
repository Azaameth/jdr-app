import { doc, getDoc, setDoc } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CampaignRulesDocument } from '../types/RpgDataModel'

// What a campaign's rules doc looks like before a GM has ever saved one —
// used by useCampaignRulesStore to fill in the fields this cluster's editing
// UI doesn't cover (Statistics/CharacterCreation, see NEXTSTEPS.md) so the
// first write is still a fully-shaped CampaignRulesDocument, not a partial.
export const DEFAULT_CAMPAIGN_RULES: CampaignRulesDocument = {
  Statistics: { Primary: [], Secondary: [] },
  Dice: {
    DiceNotation: 'd20',
    RoundingMode: 'RoundNearest',
    SuccessDirection: 'AboveOrEqual',
    CriticalThreshold: 1,
  },
  CharacterCreation: {
    HealthMaxFormula: '0',
    ManaMaxFormula: '0',
    PointBuyBudget: 0,
    FormulaRounding: 'RoundNearest',
  },
  CurrencyName: 'Pièces',
  AdvantageDiceCount: 0,
  DisadvantageDiceCount: 0,
  MaxItems: 0,
  MaxArmorSlots: 0,
  MaxWeaponSlots: 0,
}

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
  await setDoc(ref, input, { merge: true })
}
