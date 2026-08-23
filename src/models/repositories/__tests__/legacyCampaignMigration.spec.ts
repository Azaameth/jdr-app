import { describe, expect, it } from 'vitest'

interface MigrationPlanEntry {
  path: string
  data: Record<string, unknown>
}

interface MigrationPlan {
  campaigns: MigrationPlanEntry[]
  rules: { data: { Statistics: { Primary: Array<{ Key: string }> } } }
  characters: MigrationPlanEntry[]
  players: MigrationPlanEntry[]
  equipment: MigrationPlanEntry[]
  states: MigrationPlanEntry[]
  items: MigrationPlanEntry[]
}

describe('Legacy campaign migration plan', () => {
  it('builds the nested RPG structure from the legacy fixtures', async () => {
    const migrationModule = await import('../../../../scripts/migrateLegacyCampaignData.mjs')
    const { buildCampaignMigrationPlan } = migrationModule as unknown as {
      buildCampaignMigrationPlan: (...args: unknown[]) => MigrationPlan
    }
    const plan = buildCampaignMigrationPlan(
      [{ slug: 'alesia', title: 'Alésia', status: 'recrutement' }],
      [{ id: 'azarius', campaignId: 'camp-1', name: 'Azarius', raceId: 'kitsune', classId: 'cogneur' }],
      [{ uid: 'u1', campaignId: 'camp-1', characterId: 'azarius', status: 'approved' }],
      [{ uid: 'u1', campaignId: 'camp-1', characterId: 'azarius', items: [{ name: 'Rations' }] }],
      [{ id: 'cogneur', n: 'Cogneur' }],
      [{ id: 'kitsune', n: 'Kitsune' }],
      'camp-1',
    )

    expect(plan.campaigns[0]?.path).toBe('Campaigns/camp-1')
    expect(plan.rules.data.Statistics.Primary[0]).toMatchObject({ Key: 'Force' })
    expect(plan.characters[0]?.path).toBe('Campaigns/camp-1/Characters/azarius')
    expect(plan.players[0]?.path).toBe('Campaigns/camp-1/Players/u1')
    expect(plan.equipment[0]?.path).toBe('Campaigns/camp-1/Characters/azarius/Equipment/Main')
    expect(plan.states[0]?.path).toBe('Campaigns/camp-1/Characters/azarius/States/Current')
    expect(plan.items[0]?.path).toBe('Campaigns/camp-1/Characters/azarius/Items/item-1')
  })
})
