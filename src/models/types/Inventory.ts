export type InventoryCategory =
  | 'nourriture'
  | 'munitions'
  | 'bivouac'
  | 'soins'
  | 'potions'
  | 'quete'
  | 'speciaux'
  | 'docs'
  | 'gemmes'
  | 'butin'

export const BACKPACK_MAX_SLOTS: Record<InventoryCategory, number> = {
  nourriture: 1,
  munitions: 2,
  quete: 7,
  speciaux: 7,
  docs: 9,
  gemmes: 9,
  bivouac: 15,
  soins: 15,
  potions: 15,
  butin: 16,
}

export interface InventoryItem {
  itemId: string
  name: string
  quantity: number
  category: InventoryCategory
  equipped?: boolean
}

export interface WeaponArmorItem {
  itemId: string
  name: string
  damageDie?: 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20'
  damageBonus?: number
  statNote?: string
  equipped?: boolean
  statBonus?: { stat: 'maxHp' | 'maxMana' | 'armorMagique' | 'armorPhysique'; amount: number }
}

export interface CharacterInventory {
  id: string
  uid: string
  campaignId: string
  characterId: string
  items: InventoryItem[]
  weapons: WeaponArmorItem[]
  armor: WeaponArmorItem[]
  createdAt?: string
  updatedAt?: string
}
