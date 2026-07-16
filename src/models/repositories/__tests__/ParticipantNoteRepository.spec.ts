import { beforeEach, describe, expect, it, vi } from 'vitest'

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn<(...args: unknown[]) => unknown>(() => 'doc-ref'),
  getDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  setDoc: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}))

vi.mock('firebase/firestore', () => firestoreMocks)

describe('ParticipantNoteRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('when Firebase is not configured (no db)', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: undefined }))
    })

    it('no-ops every exported function without touching Firestore', async () => {
      const repo = await import('../ParticipantNoteRepository')

      expect(await repo.getParticipantNote('participant-1')).toBe('')
      expect(await repo.setParticipantNote('participant-1', 'note')).toBeUndefined()

      expect(firestoreMocks.getDoc).not.toHaveBeenCalled()
      expect(firestoreMocks.setDoc).not.toHaveBeenCalled()
    })
  })

  describe('when Firebase is configured (db present)', () => {
    beforeEach(() => {
      vi.doMock('../../../firebase/config', () => ({ db: {} }))
    })

    it('returns an empty string from getParticipantNote when the doc does not exist', async () => {
      firestoreMocks.getDoc.mockResolvedValue({ exists: () => false })

      const repo = await import('../ParticipantNoteRepository')
      const result = await repo.getParticipantNote('participant-1')

      expect(result).toBe('')
    })

    it('returns the stored personalNote from getParticipantNote when the doc exists', async () => {
      firestoreMocks.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ personalNote: 'hello', updatedAt: '2024-01-01T00:00:00.000Z' }),
      })

      const repo = await import('../ParticipantNoteRepository')
      const result = await repo.getParticipantNote('participant-1')

      expect(result).toBe('hello')
    })

    it('calls setDoc with the participant note ref and payload shape', async () => {
      firestoreMocks.setDoc.mockResolvedValue(undefined)

      const repo = await import('../ParticipantNoteRepository')
      await repo.setParticipantNote('participant-1', 'hello')

      expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'participantNotes', 'participant-1')
      expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({ personalNote: 'hello', updatedAt: expect.any(String) }),
      )
    })
  })
})
