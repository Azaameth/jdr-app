import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import type { Campaign } from '../../models/types/Campaign'
import type { useCampaignStore as UseCampaignStoreType } from '../useCampaignStore'
import type {
  NewCampaignInput,
  UpdateCampaignInput,
} from '../../models/repositories/CampaignRepository'

const mocks = vi.hoisted(() => ({
  listCampaigns: vi.fn<() => Promise<Campaign[]>>(),
  createCampaign: vi.fn<(input: NewCampaignInput) => Promise<Campaign>>(),
  assignCampaignMj: vi.fn<(campaignId: string, gmId: string) => Promise<void>>(),
  clearCampaignMj: vi.fn<(campaignId: string) => Promise<void>>(),
  updateCampaign: vi.fn<(campaignId: string, input: UpdateCampaignInput) => Promise<void>>(),
  deleteCampaign: vi.fn<(campaignId: string) => Promise<void>>(),
}))

vi.mock('../../models/repositories/CampaignRepository', () => mocks)

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c1',
    slug: 'c1-slug',
    title: 'Campagne 1',
    lore: '',
    summary: '',
    globalNote: '',
    gmId: '',
    status: 'recrutement',
    createdAt: Timestamp.now(),
    ...overrides,
  }
}

describe('useCampaignStore', () => {
  let useCampaignStore: typeof UseCampaignStoreType

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    ;({ useCampaignStore } = await import('../useCampaignStore'))
  })

  describe('fetchCampaigns', () => {
    it('loads campaigns and marks the store as initialized', async () => {
      const campaign = makeCampaign()
      mocks.listCampaigns.mockResolvedValue([campaign])
      const store = useCampaignStore()

      await store.fetchCampaigns()

      expect(store.campaigns.value).toEqual([campaign])
      expect(mocks.listCampaigns).toHaveBeenCalledTimes(1)
    })

    it('skips refetching once initialized unless force is passed', async () => {
      mocks.listCampaigns.mockResolvedValue([makeCampaign()])
      const store = useCampaignStore()

      await store.fetchCampaigns()
      await store.fetchCampaigns()
      expect(mocks.listCampaigns).toHaveBeenCalledTimes(1)

      await store.fetchCampaigns(true)
      expect(mocks.listCampaigns).toHaveBeenCalledTimes(2)
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.listCampaigns.mockRejectedValue('boom')
      const store = useCampaignStore()

      await store.fetchCampaigns()

      expect(store.error.value).toBe('Erreur de chargement des campagnes.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.listCampaigns.mockRejectedValue(new Error('network down'))
      const store = useCampaignStore()

      await store.fetchCampaigns()

      expect(store.error.value).toBe('network down')
    })
  })

  describe('addCampaign', () => {
    it('optimistically prepends the created campaign to local state on success', async () => {
      const created = makeCampaign({ id: 'new-1', title: 'Nouvelle campagne' })
      mocks.createCampaign.mockResolvedValue(created)
      const store = useCampaignStore()

      const result = await store.addCampaign({ title: 'Nouvelle campagne' })

      expect(result).toEqual(created)
      expect(store.campaigns.value[0]).toEqual(created)
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.createCampaign.mockRejectedValue({ code: 'weird' })
      const store = useCampaignStore()

      const result = await store.addCampaign({ title: 'X' })

      expect(result).toBeNull()
      expect(store.error.value).toBe('Erreur lors de la création de campagne.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.createCampaign.mockRejectedValue(new Error('quota exceeded'))
      const store = useCampaignStore()

      const result = await store.addCampaign({ title: 'X' })

      expect(result).toBeNull()
      expect(store.error.value).toBe('quota exceeded')
    })
  })

  describe('enrollMj', () => {
    it('optimistically sets gmId on the matching campaign on success', async () => {
      mocks.createCampaign.mockResolvedValue(makeCampaign({ id: 'c1', gmId: '' }))
      mocks.assignCampaignMj.mockResolvedValue(undefined)
      const store = useCampaignStore()
      await store.addCampaign({ title: 'X' })

      await store.enrollMj('c1', 'mj-42')

      expect(store.campaigns.value.find((c) => c.id === 'c1')?.gmId).toBe('mj-42')
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.assignCampaignMj.mockRejectedValue('nope')
      const store = useCampaignStore()

      await store.enrollMj('c1', 'mj-42')

      expect(store.error.value).toBe('Impossible d’inscrire le MJ.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.assignCampaignMj.mockRejectedValue(new Error('permission denied'))
      const store = useCampaignStore()

      await store.enrollMj('c1', 'mj-42')

      expect(store.error.value).toBe('permission denied')
    })
  })

  describe('withdrawMj', () => {
    it('optimistically clears gmId on the matching campaign on success', async () => {
      mocks.createCampaign.mockResolvedValue(makeCampaign({ id: 'c1', gmId: 'mj-42' }))
      mocks.clearCampaignMj.mockResolvedValue(undefined)
      const store = useCampaignStore()
      await store.addCampaign({ title: 'X' })

      await store.withdrawMj('c1')

      expect(store.campaigns.value.find((c) => c.id === 'c1')?.gmId).toBe('')
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.clearCampaignMj.mockRejectedValue('nope')
      const store = useCampaignStore()

      await store.withdrawMj('c1')

      expect(store.error.value).toBe('Impossible de retirer le MJ.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.clearCampaignMj.mockRejectedValue(new Error('offline'))
      const store = useCampaignStore()

      await store.withdrawMj('c1')

      expect(store.error.value).toBe('offline')
    })
  })

  describe('editCampaign', () => {
    it('optimistically merges the update input into the matching campaign on success', async () => {
      mocks.createCampaign.mockResolvedValue(makeCampaign({ id: 'c1', title: 'Old', summary: 'old-sum' }))
      mocks.updateCampaign.mockResolvedValue(undefined)
      const store = useCampaignStore()
      await store.addCampaign({ title: 'Old' })

      await store.editCampaign('c1', { title: 'New', summary: 'new-sum' })

      const updated = store.campaigns.value.find((c) => c.id === 'c1')
      expect(updated?.title).toBe('New')
      expect(updated?.summary).toBe('new-sum')
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.updateCampaign.mockRejectedValue('nope')
      const store = useCampaignStore()

      await store.editCampaign('c1', { title: 'New' })

      expect(store.error.value).toBe('Erreur lors de la mise à jour.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.updateCampaign.mockRejectedValue(new Error('conflict'))
      const store = useCampaignStore()

      await store.editCampaign('c1', { title: 'New' })

      expect(store.error.value).toBe('conflict')
    })
  })

  describe('removeCampaign', () => {
    it('optimistically removes the campaign from local state on success', async () => {
      mocks.createCampaign.mockResolvedValue(makeCampaign({ id: 'c1' }))
      mocks.deleteCampaign.mockResolvedValue(undefined)
      const store = useCampaignStore()
      await store.addCampaign({ title: 'X' })
      expect(store.campaigns.value.some((c) => c.id === 'c1')).toBe(true)

      await store.removeCampaign('c1')

      expect(store.campaigns.value.some((c) => c.id === 'c1')).toBe(false)
    })

    it('sets the French fallback message when the repository throws a non-Error', async () => {
      mocks.deleteCampaign.mockRejectedValue('nope')
      const store = useCampaignStore()

      await store.removeCampaign('c1')

      expect(store.error.value).toBe('Erreur lors de la suppression.')
    })

    it('surfaces the Error message when the repository throws an Error', async () => {
      mocks.deleteCampaign.mockRejectedValue(new Error('locked'))
      const store = useCampaignStore()

      await store.removeCampaign('c1')

      expect(store.error.value).toBe('locked')
    })
  })
})
