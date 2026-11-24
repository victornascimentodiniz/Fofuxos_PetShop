
import { createContext } from 'react'

import type {
  User,
  LoginCredentials,
} from '../types/auth'

export interface AuthContextData {
  user: User | null

  loading: boolean

  isAuthenticated: boolean

  connectionError: boolean

  login: (
    credentials: LoginCredentials
  ) => Promise<User>

  logout: () => Promise<void>

  refreshSession: () => Promise<void>
}

export const AuthContext =
  createContext<AuthContextData | undefined>(
    undefined
  )
