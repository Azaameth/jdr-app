import { readFileSync } from 'node:fs'

function buildCampaignRules() {
  return {
    Statistics: {
      Primary: [
        { Key: 'Strength', Label: 'Force', Min: 0, Max: 20 },
        { Key: 'Agility', Label: 'Agilité', Min: 0, Max: 20 },
        { Key: 'Intellect', Label: 'Intellect', Min: 0, Max: 20 },
        { Key: 'Spirit', Label: 'Esprit', Min: 0, Max: 20 },
      ],
      Secondary: [
        { Key: 'Power', Label: 'Puissance', LinkedPrimary: 'Strength', Formula: 'Strength * 0.5' },
        { Key: 'Focus', Label: 'Concentration', LinkedPrimary: 'Intellect', Formula: 'Intellect * 0.5' },
      ],
    },
    Dice: {
      DiceNotation: 'd20',
      RoundingMode: 'RoundNearest',
      SuccessDirection: 'AboveOrEqual',
      CriticalThreshold: 1,
    },
    CharacterCreation: {
      HealthMaxFormula: '20 + Strength * 2',
      ManaMaxFormula: '10 + Spirit * 3',
      PointBuyBudget: 20,
      FormulaRounding: 'RoundDown',
    },
    CurrencyName: 'Pièces',
    AdvantageDiceCount: 1,
    DisadvantageDiceCount: 1,
    MaxItems: 20,
    MaxArmorSlots: 2,
    MaxWeaponSlots: 2,
  }
}

function normalizeCampaign(campaign, campaignId) {
  return {
    path: `Campaigns/${campaignId}`,
    data: {
      DisplayName: campaign.title ?? 'Campagne sans titre',
      Description: campaign.summary ?? '',
      Status: campaign.status ?? 'Recruiting',
      GmId: '',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    },
  }
}

function normalizeCharacter(character, campaignId) {
  return {
    path: `Campaigns/${campaignId}/Characters/${character.id ?? character.name ?? 'unknown'}`,
    data: {
      ParentCharacterId: null,
      ActiveFormId: null,
      DisplayName: character.name ?? 'Sans nom',
      Level: character.level ?? 1,
      Status: 'Alive',
      ClassId: character.classId ?? '',
      RaceId: character.raceId ?? '',
      Statistics: {
        Strength: { Base: Number(character.attributes?.primary?.force ?? 0), Bonus: 0 },
        Agility: { Base: Number(character.attributes?.primary?.social ?? 0), Bonus: 0 },
        Intellect: { Base: Number(character.attributes?.primary?.mental ?? 0), Bonus: 0 },
        Spirit: { Base: 0, Bonus: 0 },
      },
      Secondaries: {
        Power: Number(character.attributes?.secondary?.puissance ?? 0),
        Focus: Number(character.attributes?.secondary?.savoir ?? 0),
      },
      PlayerId: character.ownerUid ?? 'unknown-user',
      CampaignId: campaignId,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    },
  }
}

function normalizePlayer(player, campaignId) {
  return {
    path: `Campaigns/${campaignId}/Players/${player.uid}`,
    data: {
      Status: player.status ?? 'Pending',
      Notes: {},
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    },
  }
}

function normalizeEquipment(inventory, campaignId) {
  return {
    path: `Campaigns/${campaignId}/Characters/${inventory.characterId}/Equipment/Main`,
    data: {
      Armor: [],
      Weapons: [],
      Currency: 0,
      PlayerId: inventory.uid ?? 'unknown-user',
      CampaignId: campaignId,
    },
  }
}

function normalizeState(character, campaignId) {
  return {
    path: `Campaigns/${campaignId}/Characters/${character.id ?? character.name ?? 'unknown'}/States/Current`,
    data: {
      Health: 50,
      HealthCurrent: 50,
      Mana: 20,
      ManaCurrent: 20,
      PhysicalArmor: 0,
      PhysicalArmorCurrent: 0,
      MagicalArmor: 0,
      MagicalArmorCurrent: 0,
      PhysicalAttack: 0,
      MagicalAttack: 0,
      PhysicalDefense: 0,
      MagicalDefense: 0,
      PlayerId: character.ownerUid ?? 'unknown-user',
      CampaignId: campaignId,
      UpdatedAt: new Date().toISOString(),
    },
  }
}

function normalizeItems(inventory, campaignId) {
  const characterId = inventory.characterId ?? 'unknown'
  return (inventory.items ?? []).map((item, index) => ({
    path: `Campaigns/${campaignId}/Characters/${characterId}/Items/${item.id ?? `item-${index + 1}`}`,
    data: {
      DisplayName: item.name ?? `Objet ${index + 1}`,
      Description: item.description ?? '',
      BonusRaw: {},
      BonusConditional: [],
      Quantity: Number(item.quantity ?? 1),
      PlayerId: inventory.uid ?? 'unknown-user',
      CampaignId: campaignId,
      UpdatedAt: new Date().toISOString(),
    },
  }))
}

export function buildCampaignMigrationPlan(
  campaigns,
  characters,
  players,
  inventories,
  classes,
  races,
  campaignId,
) {
  const campaignRules = buildCampaignRules()

  const normalizedCampaigns = campaigns.map((campaign) => normalizeCampaign(campaign, campaignId))
  const normalizedCharacters = characters.map((character) => normalizeCharacter(character, campaignId))
  const normalizedPlayers = players.map((player) => normalizePlayer(player, campaignId))
  const normalizedEquipment = inventories.map((inventory) => normalizeEquipment(inventory, campaignId))
  const normalizedStates = characters.map((character) => normalizeState(character, campaignId))
  const normalizedItems = inventories.flatMap((inventory) => normalizeItems(inventory, campaignId))

  return {
    campaignId,
    campaigns: normalizedCampaigns,
    rules: { path: `Campaigns/${campaignId}/CampaignRules/Main`, data: campaignRules },
    classes: classes.map((item) => ({
      path: `Campaigns/${campaignId}/Classes/${item.id ?? item.n}`,
      data: {
        DisplayName: item.n ?? item.id,
        Description: '',
        Bonuses: {},
        Traits: {},
        StatConstraints: {},
      },
    })),
    races: races.map((item) => ({
      path: `Campaigns/${campaignId}/Races/${item.id ?? item.n}`,
      data: {
        DisplayName: item.n ?? item.id,
        Description: '',
        Bonuses: {},
        Traits: {},
        StatConstraints: {},
      },
    })),
    characters: normalizedCharacters,
    players: normalizedPlayers,
    equipment: normalizedEquipment,
    states: normalizedStates,
    items: normalizedItems,
  }
}

export function migrateLegacyCampaignData({
  campaigns = [],
  characters = [],
  players = [],
  inventories = [],
  classes = [],
  races = [],
  campaignId,
} = {}) {
  return buildCampaignMigrationPlan(
    campaigns,
    characters,
    players,
    inventories,
    classes,
    races,
    campaignId,
  )
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const campaigns = JSON.parse(
    readFileSync(new URL('./data/campaigns-config.json', import.meta.url), 'utf8'),
  )
  const characters = JSON.parse(
    readFileSync(new URL('./data/characters.json', import.meta.url), 'utf8'),
  )
  const participants = JSON.parse(
    readFileSync(new URL('./data/participants.json', import.meta.url), 'utf8'),
  )
  const inventories = JSON.parse(
    readFileSync(new URL('./data/inventories.json', import.meta.url), 'utf8'),
  )
  const classes = JSON.parse(readFileSync(new URL('./data/classes.json', import.meta.url), 'utf8'))
  const races = JSON.parse(readFileSync(new URL('./data/races.json', import.meta.url), 'utf8'))

  const plan = migrateLegacyCampaignData({
    campaigns,
    characters,
    players: participants,
    inventories,
    classes,
    races,
    campaignId: 'alesia',
  })

  console.log(JSON.stringify(plan, null, 2))
}
