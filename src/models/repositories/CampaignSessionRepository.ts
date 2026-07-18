import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CampaignSessionState } from '../types/CampaignSession'

const CAMPAIGN_SESSIONS_COLLECTION = 'campaignSessions'

function mapCampaignSession(id: string, raw: Record<string, unknown>): CampaignSessionState {
  const rawDice = (raw.adventureDice ?? {}) as Record<string, unknown>
  return {
    id,
    campaignId: String(raw.campaignId ?? id),
    adventureDice: {
      aventure: Number(rawDice.aventure ?? 0),
      mesaventure: Number(rawDice.mesaventure ?? 0),
    },
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }
}

export async function getCampaignSession(
  campaignId: string,
): Promise<CampaignSessionState | null> {
  if (!db) return null
  const ref = doc(db, CAMPAIGN_SESSIONS_COLLECTION, campaignId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapCampaignSession(snap.id, snap.data() as Record<string, unknown>)
}

export function subscribeCampaignSession(
  campaignId: string,
  onChange: (state: CampaignSessionState | null) => void,
): Unsubscribe {
  if (!db) return () => {}
  const ref = doc(db, CAMPAIGN_SESSIONS_COLLECTION, campaignId)
  return onSnapshot(ref, (snap) => {
    onChange(
      snap.exists() ? mapCampaignSession(snap.id, snap.data() as Record<string, unknown>) : null,
    )
  })
}

export async function adjustAdventureDice(
  campaignId: string,
  die: 'aventure' | 'mesaventure',
  delta: number,
): Promise<void> {
  if (!db) return

  const ref = doc(db, CAMPAIGN_SESSIONS_COLLECTION, campaignId)
  const snap = await getDoc(ref)
  const current = snap.exists()
    ? mapCampaignSession(snap.id, snap.data() as Record<string, unknown>)
    : null

  const currentAventure = current?.adventureDice.aventure ?? 0
  const currentMesaventure = current?.adventureDice.mesaventure ?? 0
  const nextValue = Math.max(0, Math.trunc((die === 'aventure' ? currentAventure : currentMesaventure) + delta))

  await setDoc(
    ref,
    {
      campaignId,
      adventureDice: {
        aventure: die === 'aventure' ? nextValue : currentAventure,
        mesaventure: die === 'mesaventure' ? nextValue : currentMesaventure,
      },
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )
}
