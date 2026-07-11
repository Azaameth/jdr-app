import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import { db } from '../../firebase/config'
import type { User } from '../types/User'

const USERS_COLLECTION = 'users'

export async function createOrUpdateUserProfile(user: User) {
  if (!db) {
    return user
  }

  const userRef = doc(db, USERS_COLLECTION, user.uid)
  const snapshot = await getDoc(userRef)

  const payload: User & { createdAt?: string; updatedAt?: string } = {
    ...user,
    updatedAt: new Date().toISOString(),
  }

  if (!snapshot.exists()) {
    payload.createdAt = new Date().toISOString()
  }

  await setDoc(userRef, payload, { merge: true })

  return payload
}
