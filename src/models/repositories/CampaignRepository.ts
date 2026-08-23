import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Campaign, CampaignStatus } from '../types/Campaign'

const CAMPAIGNS_COLLECTION = 'Campaigns'

export interface NewCampaignInput {
  DisplayName: string
  Description?: string
  Lore?: string
  GlobalNote?: string
  GmId?: string
  Status?: CampaignStatus
}

function normalizeTimestamp(value: unknown): Timestamp {
  if (value instanceof Timestamp) {
    return value
  }

  if (typeof value === 'string' || value instanceof Date) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return Timestamp.fromDate(date)
    }
  }

  return Timestamp.now()
}

function mapCampaign(id: string, raw: Record<string, unknown>): Campaign {
  return {
    id,
    DisplayName: String(raw.DisplayName ?? 'Campagne sans titre'),
    Description: String(raw.Description ?? ''),
    Lore: String(raw.Lore ?? ''),
    GlobalNote: String(raw.GlobalNote ?? ''),
    GmId: String(raw.GmId ?? ''),
    Status: (raw.Status as CampaignStatus) ?? 'Recruiting',
    CreatedAt: normalizeTimestamp(raw.CreatedAt),
    UpdatedAt: normalizeTimestamp(raw.UpdatedAt),
  }
}

export async function listCampaigns(): Promise<Campaign[]> {
  if (!db) {
    return []
  }

  const campaignsQuery = query(collection(db, CAMPAIGNS_COLLECTION), orderBy('CreatedAt', 'desc'))
  const snapshot = await getDocs(campaignsQuery)

  return snapshot.docs.map((item) => mapCampaign(item.id, item.data() as Record<string, unknown>))
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  if (!db) {
    return null
  }

  const campaignRef = doc(db, CAMPAIGNS_COLLECTION, id)
  const snapshot = await getDoc(campaignRef)

  if (!snapshot.exists()) {
    return null
  }

  return mapCampaign(snapshot.id, snapshot.data() as Record<string, unknown>)
}

export async function createCampaign(input: NewCampaignInput): Promise<Campaign> {
  const now = Timestamp.now()
  const payload = {
    DisplayName: input.DisplayName,
    Description: input.Description ?? '',
    Lore: input.Lore ?? '',
    GlobalNote: input.GlobalNote ?? '',
    GmId: input.GmId ?? '',
    Status: input.Status ?? 'Recruiting',
    CreatedAt: now,
    UpdatedAt: now,
  }

  if (!db) {
    return {
      id: `local-${Math.random().toString(36).slice(2, 10)}`,
      ...payload,
    }
  }

  const campaignRef = doc(collection(db, CAMPAIGNS_COLLECTION))
  await setDoc(campaignRef, payload)
  return mapCampaign(campaignRef.id, payload)
}

export async function assignCampaignMj(campaignId: string, gmId: string): Promise<void> {
  if (!db) {
    return
  }

  const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId)
  await updateDoc(campaignRef, { GmId: gmId, UpdatedAt: Timestamp.now() })
}

export async function clearCampaignMj(campaignId: string): Promise<void> {
  if (!db) {
    return
  }

  const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId)
  await updateDoc(campaignRef, { GmId: '', UpdatedAt: Timestamp.now() })
}

export interface UpdateCampaignInput {
  DisplayName?: string
  Description?: string
  Lore?: string
  GlobalNote?: string
  Status?: CampaignStatus
}

export async function updateCampaign(
  campaignId: string,
  input: UpdateCampaignInput,
): Promise<void> {
  if (!db) return
  const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId)
  await updateDoc(campaignRef, { ...input, UpdatedAt: Timestamp.now() })
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  if (!db) return
  const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId)
  await deleteDoc(campaignRef)
}
