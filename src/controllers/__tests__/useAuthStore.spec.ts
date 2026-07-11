import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))

vi.mock('../../firebase/config', () => ({
  auth: undefined,
  googleProvider: undefined,
  isFirebaseConfigured: false,
}))

vi.mock('../models/repositories/UserRepository', () => ({
  createOrUpdateUserProfile: vi.fn(async (user) => user),
}))

import { useAuthStore } from '../useAuthStore'

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to a demo user when Firebase auth is unavailable', async () => {
    const authStore = useAuthStore()

    await authStore.signInWithGoogle()

    expect(authStore.user.value?.displayName).toBe('Utilisateur démo')
    expect(authStore.error.value).toBeNull()
  })
})
