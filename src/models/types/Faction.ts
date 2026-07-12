export interface FactionFact {
  label: string
  value: string
}

export interface Faction {
  id: string
  order: number
  icon: string
  title: string
  subtitle: string
  badge: string
  accent: string
  description: string
  facts: FactionFact[]
}
