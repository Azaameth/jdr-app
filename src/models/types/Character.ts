export interface CharacterStats {
  force: number
  dexterite: number
  constitution: number
  intelligence: number
  sagesse: number
  charisme: number
}

export interface InventoryItem {
  name: string
  quantity: number
  description: string
}

export interface Character {
  id: string
  name: string
  class: string
  level: number
  stats: CharacterStats
  history: string
  inventory: InventoryItem[]
}
