
export type UserRole =
  'ADMIN' | 'MANAGER' | 'OPERATOR'

export interface UserProfile {
  id: string
  code: string
  name: string
  active: boolean
  isSystem: boolean
}

export interface User {
  id: string
  name: string
  username: string

  // Compatibilidade temporária.
  role: UserRole

  active: boolean
  mustChangePassword: boolean

  profileId: string
  profile: UserProfile

  permissions: string[]
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  message: string
  user: User
  expiresAt: string
}

export interface MeResponse {
  user: User
}

export const roleLabels: Record<
  UserRole,
  string
> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  OPERATOR: 'Operador de caixa',
}
