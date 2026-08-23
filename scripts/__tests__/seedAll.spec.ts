import { describe, expect, it } from 'vitest'

import { resolveOwnerUid } from '../seedAll.mjs'

describe('seedAll owner identity', () => {
  it('prefers the user email over the character identity', () => {
    expect(
      resolveOwnerUid({
        ownerUid: 'character-42',
        uid: 'legacy-uid',
        email: 'joueur@example.com',
        userEmail: 'fallback@example.com',
      }, 'character-42'),
    ).toBe('joueur@example.com')
  })

  it('falls back to a neutral user ID instead of a character id', () => {
    expect(resolveOwnerUid({ ownerUid: 'character-42', uid: 'character-42' }, 'character-42')).toBe('unknown-user')
  })
})
