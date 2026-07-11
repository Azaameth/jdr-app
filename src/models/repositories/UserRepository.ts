import { doc, getDoc, setDoc } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { User, UserProfile } from '../types/User'

const USERS_COLLECTION = 'users'

export async function getUserProfile(uid: string): Promise<User | null> {
  if (!db) {
    return null
  }

  const userRef = doc(db, USERS_COLLECTION, uid)
  const snapshot = await getDoc(userRef)

  if (!snapshot.exists()) {
    return null
  }

  return snapshot.data() as User
}

export async function createOrUpdateUserProfile(user: User): Promise<UserProfile> {
  if (!db) {
    return user
  }

  const userRef = doc(db, USERS_COLLECTION, user.uid)
  const snapshot = await getDoc(userRef)
  const existingData = snapshot.exists() ? (snapshot.data() as Partial<UserProfile>) : {}
  const role = (existingData.role as User['role']) ?? user.role

  const payload: UserProfile = {
    ...existingData,
    ...user,
    role,
    createdAt: existingData.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await setDoc(userRef, payload, { merge: true })
  return payload
}
