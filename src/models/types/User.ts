export type UserRole = 'joueur' | 'mj' | 'admin'

export interface User {
  uid: string
  displayName: string
  email: string
  photoURL: string
  role: UserRole
}

export interface UserProfile extends User {
  createdAt?: string
  updatedAt?: string
}
