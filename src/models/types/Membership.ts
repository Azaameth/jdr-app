export type MembershipStatus = 'pending' | 'approved' | 'rejected'

export interface Membership {
  uid: string
  campaignId: string
  status: MembershipStatus
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  personalNote: string
}
