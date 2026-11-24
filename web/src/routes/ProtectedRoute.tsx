
import {
  Navigate,
  Outlet,
  Link,
} from 'react-router-dom'

import {
  LoaderCircle,
  ShieldAlert,
  ServerOff,
} from 'lucide-react'

import { useAuth } from '../hooks/useAuth'

import {
  getDefaultRoute,
} from '../constants/navigation'

interface ProtectedRouteProps {
  permission?: string
  allowPasswordChange?: boolean
}

export default function ProtectedRoute({
  permission,
  allowPasswordChange = false,
}: ProtectedRouteProps) {
  const {
    user,
    loading,
    connectionError,
    refreshSession,
  } = useAuth()

  // Verificando a sessão
  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-brand-background">

        <LoaderCircle
          size={38}
          className="animate-spin text-brand-primary"
        />

        <p className="text-sm text-gray-500">
          Verificando sua sessão...
        </p>

      </div>
    )
  }

  // Servidor indisponível
  if (connectionError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-brand-background p-6 text-center">

        <ServerOff
          size={48}
          className="text-brand-primary"
        />

        <h1 className="text-xl font-bold">
          Servidor indisponível
        </h1>

        <p className="text-sm text-gray-500">
          Não foi possível conectar ao servidor.
        </p>

        <button
          type="button"
          onClick={() => void refreshSession()}
          className="rounded-xl bg-brand-primary px-5 py-3 font-semibold text-white"
        >
          Tentar novamente
        </button>

      </div>
    )
  }

  // Usuário não autenticado
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Alteração obrigatória da senha temporária
  if (
    user.mustChangePassword &&
    !allowPasswordChange
  ) {
    return (
      <Navigate
        to="/alterar-senha"
        replace
      />
    )
  }

  // Permissões concedidas ao usuário
  const permissions = user.permissions ?? []

  // Verifica a permissão necessária para acessar a página
  if (
    permission &&
    !permissions.includes(permission)
  ) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">

        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-pink-50">

          <ShieldAlert
            size={42}
            className="text-brand-primary"
          />

        </div>

        <h1 className="text-2xl font-bold text-brand-dark">
          Acesso não autorizado
        </h1>

        <p className="max-w-md text-sm text-gray-500">
          Seu perfil não possui permissão para acessar
          esta página. Entre em contato com o
          administrador do sistema.
        </p>

        <Link
          to={getDefaultRoute(permissions)}
          className="rounded-xl bg-brand-primary px-5 py-3 font-semibold text-white"
        >
          Voltar para página inicial
        </Link>

      </div>
    )
  }

  return <Outlet />
}
