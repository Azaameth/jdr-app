import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Membership, MembershipStatus, Posture, SessionInventoryItem } from '../types/Membership'

const MEMBERSHIPS_COLLECTION = 'memberships'

function mapMembership(raw: Record<string, unknown>): Membership {
  const rawSession = (raw.session ?? {}) as Record<string, unknown>
  return {
    uid: String(raw.uid ?? ''),
    campaignId: String(raw.campaignId ?? ''),
    characterId: String(raw.characterId ?? ''),
    status: (raw.status as MembershipStatus) ?? 'pending',
    personalNote: String(raw.personalNote ?? ''),
    session: {
      hp: Number(rawSession.hp ?? 0),
      maxHp: Number(rawSession.maxHp ?? 0),
      mana: Number(rawSession.mana ?? 0),
      maxMana: Number(rawSession.maxMana ?? 0),
      posture: (rawSession.posture as Posture) ?? 'DEFENSIF',
      inventory: Array.isArray(rawSession.inventory)
        ? (rawSession.inventory as SessionInventoryItem[])
        : [],
      updatedAt: rawSession.updatedAt ? String(rawSession.updatedAt) : undefined,
    },
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }
}

export async function listMembershipsByCampaign(campaignId: string): Promise<Membership[]> {
  if (!db) return []
  const q = query(collection(db, MEMBERSHIPS_COLLECTION), where('campaignId', '==', campaignId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => mapMembership(doc.data()))
}

export async function getMembership(uid: string, campaignId: string): Promise<Membership | null> {
  if (!db) return null
  const q = query(
    collection(db, MEMBERSHIPS_COLLECTION),
    where('uid', '==', uid),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(q)
  const first = snapshot.docs[0]
  return first ? mapMembership(first.data()) : null
}

export async function getMembershipByCharacterId(
  characterId: string,
  campaignId: string,
): Promise<Membership | null> {
  if (!db) return null
  const q = query(
    collection(db, MEMBERSHIPS_COLLECTION),
    where('characterId', '==', characterId),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(q)
  const first = snapshot.docs[0]
  return first ? mapMembership(first.data()) : null
}
