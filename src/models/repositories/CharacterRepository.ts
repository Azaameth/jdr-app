import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CharacterProfile } from '../types/Character'

function mapCharacter(docSnap: { id: string; data: () => Record<string, unknown> }): CharacterProfile {
  const raw = docSnap.data() as Record<string, unknown>
  const normalized: Record<string, unknown> = { id: docSnap.id }

  const fieldAliases: Array<[string, string[]]> = [
    ['campaignId', ['CampaignId', 'campaignId']],
    ['ownerUid', ['PlayerId', 'ownerUid']],
    ['name', ['DisplayName', 'name']],
    ['raceId', ['RaceId', 'raceId']],
    ['classId', ['ClassId', 'classId']],
    ['gender', ['Gender', 'gender']],
    ['level', ['Level', 'level']],
    ['parentCharacterId', ['ParentCharacterId', 'parentCharacterId']],
    ['activeFormId', ['ActiveFormId', 'activeFormId']],
    ['img', ['PictureUrl', 'pictureUrl', 'img']],
    ['backstory', ['Backstory', 'backstory']],
  ]

  for (const [targetKey, aliases] of fieldAliases) {
    const value = aliases.map((alias) => raw[alias]).find((candidate) => candidate !== undefined)
    if (value !== undefined) {
      normalized[targetKey] = value
    }
  }

  for (const [key, value] of Object.entries(raw)) {
    if (key in normalized) continue
    if (['CampaignId', 'campaignId', 'PlayerId', 'ownerUid', 'DisplayName', 'name', 'ParentCharacterId', 'parentCharacterId', 'ActiveFormId', 'activeFormId', 'RaceId', 'raceId', 'ClassId', 'classId', 'Gender', 'gender', 'Level', 'level', 'PictureUrl', 'pictureUrl', 'Backstory', 'backstory'].includes(key)) {
      continue
    }
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

export async function getCharacterById(id: string): Promise<CharacterProfile | null> {
  if (!db) return null
  const ref = doc(db, 'Characters', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return mapCharacter({ id: snap.id, data: () => snap.data() as Record<string, unknown> })
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
