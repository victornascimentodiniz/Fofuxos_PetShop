
import axios from 'axios'
import api from './api'

import type {
  Permission,
  Profile,
  AvailableProfile,
  ManagedUser,
  CreateUserInput,
  UpdateUserInput,
  ProfileInput,
} from '../types/management'

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message

    if (Array.isArray(message)) {
      return message.join(' | ')
    }

    if (typeof message === 'string') {
      return message
    }

    if (!error.response) {
      return 'Não foi possível conectar ao servidor.'
    }
  }

  return 'Não foi possível concluir a operação.'
}

export const managementService = {
  async getPermissions() {
    const response =
      await api.get<Permission[]>('/permissions')

    return response.data
  },

  async getProfiles() {
    const response =
      await api.get<Profile[]>('/profiles')

    return response.data
  },

  async createProfile(data: ProfileInput) {
    const response =
      await api.post<Profile>('/profiles', data)

    return response.data
  },

  async updateProfile(
    id: string,
    data: {
      name: string
      description: string
    }
  ) {
    const response =
      await api.patch<Profile>(
        `/profiles/${id}`,
        data
      )

    return response.data
  },

  async updatePermissions(
    id: string,
    permissionCodes: string[]
  ) {
    const response =
      await api.put<Profile>(
        `/profiles/${id}/permissions`,
        { permissionCodes }
      )

    return response.data
  },

  async updateProfileStatus(
    id: string,
    active: boolean
  ) {
    await api.patch(
      `/profiles/${id}/status`,
      { active }
    )
  },

  async getAvailableProfiles() {
    const response =
      await api.get<AvailableProfile[]>(
        '/users/available-profiles'
      )

    return response.data
  },

  async getUsers() {
    const response =
      await api.get<ManagedUser[]>('/users')

    return response.data
  },

  async createUser(data: CreateUserInput) {
    const response =
      await api.post<ManagedUser>('/users', data)

    return response.data
  },

  async updateUser(
    id: string,
    data: UpdateUserInput
  ) {
    const response =
      await api.patch<ManagedUser>(
        `/users/${id}`,
        data
      )

    return response.data
  },

  async updateUserStatus(
    id: string,
    active: boolean
  ) {
    await api.patch(
      `/users/${id}/status`,
      { active }
    )
  },

  async resetPassword(
    id: string,
    password: string
  ) {
    await api.post(
      `/users/${id}/reset-password`,
      { password }
    )
  },
}
