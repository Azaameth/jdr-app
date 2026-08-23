import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Participant, ParticipantStatus } from '../types/Participant'

function getCampaignPlayersCollection(campaignId: string) {
  if (!db) {
    return null
  }
  return collection(db, 'Campaigns', campaignId, 'Players')
}

// Doc ID == uid per docs/rpg-data-model.md §4.6 — not an auto-generated id
// found by querying, which is what this repository used to do.
function getCampaignPlayerDoc(campaignId: string, uid: string) {
  if (!db) {
    return null
  }
  return doc(db, 'Campaigns', campaignId, 'Players', uid)
}

function mapParticipant(id: string, raw: Record<string, unknown>): Participant {
  return {
    id,
    // Doc ID == uid now (see getCampaignPlayerDoc) — fall back to a stored
    // `uid` field only for any pre-migration doc that doesn't have it.
    uid: String(raw.uid ?? id),
    campaignId: String(raw.campaignId ?? ''),
    status: (raw.status as ParticipantStatus) ?? 'Pending',
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }
}

export async function listParticipantsByCampaign(campaignId: string): Promise<Participant[]> {
  if (!db) return []

  const nestedRef = getCampaignPlayersCollection(campaignId)
  if (!nestedRef) return []

  const nestedSnapshot = await getDocs(nestedRef)
  return nestedSnapshot.docs.map((docSnap) => mapParticipant(docSnap.id, docSnap.data()))
}

export function subscribeParticipantsByCampaign(
  campaignId: string,
  onChange: (participants: Participant[]) => void,
): Unsubscribe {
  if (!db) return () => {}

  const nestedRef = getCampaignPlayersCollection(campaignId)
  if (!nestedRef) return () => {}

  return onSnapshot(nestedRef, (snapshot) => {
    onChange(snapshot.docs.map((docSnap) => mapParticipant(docSnap.id, docSnap.data())))
  })
}

export async function getParticipant(uid: string, campaignId: string): Promise<Participant | null> {
  if (!db) return null

  const playerRef = getCampaignPlayerDoc(campaignId, uid)
  if (!playerRef) return null

  const snapshot = await getDoc(playerRef)
  return snapshot.exists() ? mapParticipant(snapshot.id, snapshot.data()) : null
}
