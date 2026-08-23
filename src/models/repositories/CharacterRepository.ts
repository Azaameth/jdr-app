import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CharacterProfile } from '../types/Character'

// Every producer (scripts/seedAll.mjs, scripts/migrateLegacyCampaignData.mjs)
// writes exclusively PascalCase into the nested Characters collection — the
// camelCase fallback this used to carry (for a flat legacy shape) was removed
// once that was confirmed (NEXTSTEPS.md migration ledger, Cluster 8).
function mapCharacter(docSnap: { id: string; data: () => Record<string, unknown> }): CharacterProfile {
  const raw = docSnap.data() as Record<string, unknown>
  const normalized: Record<string, unknown> = { id: docSnap.id }

  const fieldAliases: Array<[string, string]> = [
    ['campaignId', 'CampaignId'],
    ['ownerUid', 'PlayerId'],
    ['name', 'DisplayName'],
    ['raceId', 'RaceId'],
    ['classId', 'ClassId'],
    ['gender', 'Gender'],
    ['level', 'Level'],
    ['parentCharacterId', 'ParentCharacterId'],
    ['activeFormId', 'ActiveFormId'],
    ['img', 'PictureUrl'],
    ['backstory', 'Backstory'],
  ]

  for (const [targetKey, sourceKey] of fieldAliases) {
    if (raw[sourceKey] !== undefined) {
      normalized[targetKey] = raw[sourceKey]
    }
  }

  const aliasedSourceKeys = new Set(fieldAliases.map(([, sourceKey]) => sourceKey))
  for (const [key, value] of Object.entries(raw)) {
    if (aliasedSourceKeys.has(key)) continue
    normalized[key] = value
  }

  return normalized as unknown as CharacterProfile
}

function getCampaignCharactersCollection(campaignId: string) {
  if (!db) {
    throw new Error('Firebase non configuré')
  }

  return collection(db, 'Campaigns', campaignId, 'Characters')
}

export async function listCharactersByCampaign(campaignId: string): Promise<CharacterProfile[]> {
  if (!db) {
    return []
  }

  const snapshot = await getDocs(getCampaignCharactersCollection(campaignId))
  return snapshot.docs.map((docSnap) => mapCharacter(docSnap))
}

export async function getCharacterByCampaign(
  campaignId: string,
  id: string,
): Promise<CharacterProfile | null> {
  if (!db) return null
  const ref = doc(db, 'Campaigns', campaignId, 'Characters', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapCharacter({ id: snap.id, data: () => snap.data() as Record<string, unknown> })
}

export async function listChildrenOf(
  campaignId: string,
  parentCharacterId: string,
): Promise<CharacterProfile[]> {
  if (!db) return []

  const nestedQuery = query(
    getCampaignCharactersCollection(campaignId),
    where('ParentCharacterId', '==', parentCharacterId),
  )
  const snapshot = await getDocs(nestedQuery)

  return snapshot.docs.map((docSnap) => mapCharacter(docSnap))
}

export async function updateCharacter(
  id: string,
  fields: Partial<CharacterProfile>,
  campaignId?: string,
): Promise<void> {
  if (!db) return
  const payload: Partial<CharacterProfile> = { ...fields }
  delete payload.id

  const ref = doc(db, 'Campaigns', campaignId ?? 'unknown', 'Characters', id)

  await updateDoc(ref, { ...payload, updatedAt: new Date().toISOString() })
}
