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
    ['elements', 'Elements'],
    ['languages', 'Languages'],
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

  // These three need reshaping, not a bare rename, so they can't go through
  // the alias list above: Statistics/Secondaries (per-stat {Base,Bonus} maps
  // keyed by this game's real vocabulary — see docs/rpg-data-model.md's
  // CharacterRules note and scripts/seedAll.mjs) become the flat
  // primary/secondary numbers CaracTab.vue/ChildSheetTab.vue/jetFormula.ts
  // actually read; Skills' Firestore map becomes the CharacterSkill[] array
  // views iterate. Gifts has no live producer (the old dons system was
  // retired in Cluster 4) so it always defaults to empty rather than
  // undefined.
  const statistics = raw.Statistics as
    | Record<string, { Base?: number; Bonus?: number } | undefined>
    | undefined
  const secondaries = raw.Secondaries as Record<string, number> | undefined
  const statBase = (key: string) =>
    (statistics?.[key]?.Base ?? 0) + (statistics?.[key]?.Bonus ?? 0)

  normalized.attributes = {
    primary: {
      force: statBase('Force'),
      social: statBase('Social'),
      mental: statBase('Mental'),
    },
    secondary: {
      puissance: secondaries?.Puissance ?? 0,
      finesse: secondaries?.Finesse ?? 0,
      aura: secondaries?.Aura ?? 0,
      relation: secondaries?.Relation ?? 0,
      instinct: secondaries?.Instinct ?? 0,
      savoir: secondaries?.Savoir ?? 0,
    },
  }

  const skillsMap = raw.Skills as Record<string, { Description?: string; Value?: number }> | undefined
  normalized.skills = skillsMap
    ? Object.entries(skillsMap).map(([id, skill]) => ({
        id,
        name: skill.Description ?? '',
        rank: skill.Value ?? 0,
        domain: 'general' as const,
      }))
    : []

  normalized.gifts = []

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
