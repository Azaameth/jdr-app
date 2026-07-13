export interface InventoryItem {
  itemId: string
  name: string
  quantity: number
  equipped?: boolean
}

export interface CharacterInventory {
  uid: string
  campaignId: string
  characterId: string
  items: InventoryItem[]
  createdAt?: string
  updatedAt?: string
}
