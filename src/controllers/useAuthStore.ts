import { computed, ref } from 'vue'
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'

import { auth, googleProvider } from '../firebase/config'
import type { User } from '../models/types/User'
import { createOrUpdateUserProfile } from '../models/repositories/UserRepository'

const user = ref<User | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function syncUserProfile(firebaseUser: FirebaseUser) {
  const profile: User = {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName ?? 'Utilisateur',
    email: firebaseUser.email ?? '',
    photoURL: firebaseUser.photoURL ?? '',
    role: 'joueur',
  }

  try {
    return await createOrUpdateUserProfile(profile)
  } catch (err) {
    error.value = 'Impossible de synchroniser le profil utilisateur.'
    return profile
  }
}

if (auth) {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      user.value = await syncUserProfile(firebaseUser)
    } else {
      user.value = null
    }
  })
}

export function useAuthStore() {
  return {
    user: computed(() => user.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    isAuthenticated: computed(() => Boolean(user.value)),
    isAdmin: computed(() => user.value?.role === 'admin'),
    isMj: computed(() => user.value?.role === 'mj'),
    isPlayer: computed(() => user.value?.role === 'joueur'),
    async signInWithGoogle() {
      loading.value = true
      error.value = null

      if (!auth || !googleProvider) {
        error.value = 'L’authentification Firebase n’est pas configurée sur cette instance.'
        loading.value = false
        return
      }

      try {
        const result = await signInWithPopup(auth, googleProvider)
        const firebaseUser = result.user

        user.value = await syncUserProfile(firebaseUser)
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Erreur d’authentification'
      } finally {
        loading.value = false
      }
    },
    async signOut() {
      loading.value = true
      error.value = null

      if (!auth) {
        error.value = 'L’authentification Firebase n’est pas configurée sur cette instance.'
        loading.value = false
        return
      }

      try {
        await firebaseSignOut(auth)
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Erreur de déconnexion'
      } finally {
        loading.value = false
      }
    },
  }
}
