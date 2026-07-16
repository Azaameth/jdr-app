export type CosmologyBranch = 'left' | 'middle' | 'right'

export interface CosmologyExample {
  name: string
  epithet: string
}

export interface CosmologyTier {
  id: string
  order: number
  title: string
  legendLabel: string
  subtitle: string
  description: string
  ruleNote?: string
  footnote?: string
  examples: CosmologyExample[]
  branch?: CosmologyBranch
}
