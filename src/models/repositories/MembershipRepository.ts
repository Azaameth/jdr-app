import { collection, getDocs, query, where } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { Membership } from '../types/Membership'

const MEMBERSHIPS_COLLECTION = 'memberships'

export async function listMembershipsByCampaign(campaignId: string): Promise<Membership[]> {
  if (!db) return []
  const q = query(collection(db, MEMBERSHIPS_COLLECTION), where('campaignId', '==', campaignId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => doc.data() as Membership)
}

export async function getMembership(uid: string, campaignId: string): Promise<Membership | null> {
  if (!db) return null
  const q = query(
    collection(db, MEMBERSHIPS_COLLECTION),
    where('uid', '==', uid),
    where('campaignId', '==', campaignId),
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  return snapshot.docs[0].data() as Membership
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
  if (snapshot.empty) return null
  return snapshot.docs[0].data() as Membership
}
