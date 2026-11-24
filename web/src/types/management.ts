export interface Permission {
  id: string
  code: string
  name: string
  module: string
  description: string | null
}

export interface Profile {
  id: string
  code: string
  name: string
  description: string | null
  active: boolean
  isSystem: boolean
  usersCount: number
  permissionsCount: number
  permissions: Permission[]
}

export interface AvailableProfile {
  id: string
  code: string
  name: string
  active: boolean
  isSystem: boolean
  permissions: Permission[]
}

export interface ManagedUser {
  id: string
  name: string
  username: string
  active: boolean
  profileId: string | null
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string

  profile: {
    id: string
    code: string
    name: string
    active: boolean
    isSystem: boolean
  } | null
}

export interface CreateUserInput {
  name: string
  username: string
  password: string
  profileId: string
}

export interface UpdateUserInput {
  name: string
  username: string
  profileId: string
}

export interface ProfileInput {
  name: string
  description: string
  permissionCodes: string[]
}