
import {
  useState,
  useEffect,
  useCallback,
} from 'react'

import type { ReactNode } from 'react'

import axios from 'axios'

import { AuthContext } from './auth-context'

import { authService } from '../services/auth.service'
import { SESSION_EXPIRED_EVENT } from '../services/api'

import type {
  User,
  LoginCredentials,
} from '../types/auth'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] =
    useState<User | null>(null)

  const [loading, setLoading] = useState(true)

  const [connectionError, setConnectionError] =
    useState(false)

  const userId = user?.id

  // Consulta a sessão atual do usuário
  const refreshSession = useCallback(async () => {
    setLoading(true)
    setConnectionError(false)

    try {
      const response = await authService.me()

      setUser(response.user)
    } catch (error) {
      setUser(null)

      if (
        !axios.isAxiosError(error) ||
        error.response?.status !== 401
      ) {
        setConnectionError(true)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Verifica a sessão ao iniciar o sistema
  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  // Trata sessões expiradas
  useEffect(() => {
    function handleSessionExpired() {
      setUser(null)
    }

    window.addEventListener(
      SESSION_EXPIRED_EVENT,
      handleSessionExpired
    )

    return () => {
      window.removeEventListener(
        SESSION_EXPIRED_EVENT,
        handleSessionExpired
      )
    }
  }, [])

  // Atualiza a sessão, o perfil e as permissões
  // automaticamente a cada 60 segundos
  useEffect(() => {
    if (!userId) return

    let cancelled = false
    let checking = false

    async function checkSession() {
      if (checking || cancelled) return

      checking = true

      try {
        const response = await authService.me()

        if (cancelled) return

        setUser((currentUser) => {
          if (
            !currentUser ||
            currentUser.id !== response.user.id
          ) {
            return currentUser
          }

          return response.user
        })

        setConnectionError(false)
      } catch (error) {
        if (cancelled) return

        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401
        ) {
          setUser(null)
        }
      } finally {
        checking = false
      }
    }

    const interval = window.setInterval(
      () => void checkSession(),
      60000
    )

    return () => {
      cancelled = true

      window.clearInterval(interval)
    }
  }, [userId])

  // Realiza o login
  async function login(
    credentials: LoginCredentials
  ): Promise<User> {
    const response = await authService.login(
      credentials
    )

    setUser(response.user)
    setConnectionError(false)

    return response.user
  }

  // Encerra a sessão
  async function logout(): Promise<void> {
    await authService.logout()

    setUser(null)
    setConnectionError(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        connectionError,
        isAuthenticated: Boolean(user),
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
