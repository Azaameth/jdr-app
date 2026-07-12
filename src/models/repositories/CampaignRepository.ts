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
  where,
} from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Campaign, CampaignStatus } from '../types/Campaign'

const CAMPAIGNS_COLLECTION = 'campaigns'

export interface NewCampaignInput {
  slug?: string
  title: string
  lore?: string
  summary?: string
  globalNote?: string
  gmId?: string
  status?: CampaignStatus
}

function normalizeCreatedAt(value: unknown): Timestamp {
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
    slug: String(raw.slug ?? ''),
    title: String(raw.title ?? 'Campagne sans titre'),
    lore: String(raw.lore ?? ''),
    summary: String(raw.summary ?? ''),
    globalNote: String(raw.globalNote ?? ''),
    gmId: String(raw.gmId ?? ''),
    status: (raw.status as CampaignStatus) ?? 'recrutement',
    createdAt: normalizeCreatedAt(raw.createdAt),
  }
}

export async function listCampaigns(): Promise<Campaign[]> {
  if (!db) {
    return []
  }

  const campaignsQuery = query(collection(db, CAMPAIGNS_COLLECTION), orderBy('createdAt', 'desc'))
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
  const payload = {
    slug: input.slug ?? '',
    title: input.title,
    lore: input.lore ?? '',
    summary: input.summary ?? '',
    globalNote: input.globalNote ?? '',
    gmId: input.gmId ?? '',
    status: input.status ?? 'recrutement',
    createdAt: Timestamp.now(),
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
  await updateDoc(campaignRef, { gmId })
}

export async function clearCampaignMj(campaignId: string): Promise<void> {
  if (!db) {
    return
  }

  const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId)
  await updateDoc(campaignRef, { gmId: '' })
}

export async function findCampaignBySlug(slug: string): Promise<Campaign | null> {
  if (!db) return null
  const q = query(collection(db, CAMPAIGNS_COLLECTION), where('slug', '==', slug))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const first = snapshot.docs[0]
  if (!first) return null
  return mapCampaign(first.id, first.data() as Record<string, unknown>)
}

export interface UpdateCampaignInput {
  title?: string
  lore?: string
  summary?: string
  globalNote?: string
  status?: CampaignStatus
}

export async function updateCampaign(
  campaignId: string,
  input: UpdateCampaignInput,
): Promise<void> {
  if (!db) return
  const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId)
  await updateDoc(campaignRef, { ...input })
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  if (!db) return
  const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId)
  await deleteDoc(campaignRef)
}
