declare module '../../../../scripts/migrateLegacyCampaignData.mjs' {
  export function buildCampaignMigrationPlan(
    campaigns: Array<Record<string, unknown>>,
    characters: Array<Record<string, unknown>>,
    players: Array<Record<string, unknown>>,
    inventories: Array<Record<string, unknown>>,
    classes: Array<Record<string, unknown>>,
    races: Array<Record<string, unknown>>,
    campaignId: string,
  ): {
    campaignId: string
    campaigns: Array<{ path: string; data: Record<string, unknown> }>
    rules: { path: string; data: Record<string, unknown> }
    classes: Array<{ path: string; data: Record<string, unknown> }>
    races: Array<{ path: string; data: Record<string, unknown> }>
    characters: Array<{ path: string; data: Record<string, unknown> }>
    players: Array<{ path: string; data: Record<string, unknown> }>
    equipment: Array<{ path: string; data: Record<string, unknown> }>
  }
}
