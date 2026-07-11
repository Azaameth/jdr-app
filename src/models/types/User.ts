export type UserRole = 'joueur' | 'mj'

export interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string
  role: UserRole
}
