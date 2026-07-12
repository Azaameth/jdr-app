import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn<() => void>(),
  signOut: vi.fn<() => void>(),
  onAuthStateChanged: vi.fn<() => void>(),
}))

vi.mock('../../firebase/config', () => ({
  auth: undefined,
  googleProvider: undefined,
  isFirebaseConfigured: false,
}))

vi.mock('../models/repositories/UserRepository', () => ({
  createOrUpdateUserProfile: vi.fn<(user: unknown) => Promise<unknown>>(async (user) => user),
}))

import { useAuthStore } from '../useAuthStore'

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('surfaces a French error when Firebase auth is unavailable', async () => {
    const authStore = useAuthStore()

    await authStore.signInWithGoogle()

    expect(authStore.user.value).toBeNull()
    expect(authStore.error.value).toBe(
      'L’authentification Firebase n’est pas configurée sur cette instance.',
    )
  })
})
