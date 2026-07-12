import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { CharacterProfile } from '../types/Character'

const CHARACTERS_COLLECTION = 'characters'

function mapCharacter(raw: Record<string, unknown>): CharacterProfile {
  return raw as CharacterProfile
}

export async function listCharactersByCampaign(campaignId: string): Promise<CharacterProfile[]> {
  if (!db) {
    return []
  }

  const charactersQuery = query(
    collection(db, CHARACTERS_COLLECTION),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(charactersQuery)

  return snapshot.docs.map((doc) => mapCharacter(doc.data() as Record<string, unknown>))
}
