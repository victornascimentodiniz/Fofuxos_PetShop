
import api from './api'

import type {
  LoginCredentials,
  LoginResponse,
  MeResponse,
} from '../types/auth'

export const authService = {
  async login(
    credentials: LoginCredentials
  ): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>(
      '/auth/login',
      credentials
    )

    return response.data
  },

  async me(): Promise<MeResponse> {
    const response = await api.get<MeResponse>(
      '/auth/me'
    )

    return response.data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },
}
