
import { useState } from 'react'

import {
  Menu,
  CalendarDays,
  UserRound,
  LogOut,
  LoaderCircle,
} from 'lucide-react'

import {
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { navigation } from '../../constants/navigation'

import { useAuth } from '../../hooks/useAuth'

import { roleLabels } from '../../types/auth'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({
  onMenuClick,
}: HeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const { user, logout } = useAuth()

  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')

  const currentPage = navigation
    .flatMap((group) => group.items)
    .find((item) => item.path === location.pathname)

  const formattedDate = new Intl.DateTimeFormat(
    'pt-BR',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  ).format(new Date())

  async function handleLogout() {
    if (leaving) return

    setLeaving(true)
    setError('')

    try {
      await logout()

      navigate('/login', { replace: true })
    } catch {
      setError(
        'Não foi possível sair. Tente novamente.'
      )
    } finally {
      setLeaving(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">

      <div className="flex h-20 items-center justify-between gap-4 px-4 md:px-7">

        <div className="flex items-center gap-3">

          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>

          <div>

            <p className="text-xs text-gray-400">
              Fofuxos Gestão
            </p>

            <p className="mt-1 text-sm font-semibold text-brand-dark">
              {currentPage?.label ??
                'Página administrativa'}
            </p>

          </div>

        </div>

        <div className="flex items-center gap-3 md:gap-5">

          <div className="hidden items-center gap-2 text-sm text-gray-500 xl:flex">

            <CalendarDays size={17} />

            <span>{formattedDate}</span>

          </div>

          <div className="hidden h-9 w-px bg-gray-200 xl:block" />

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary-light text-brand-primary">

              <UserRound size={20} />

            </div>

            <div className="hidden sm:block">

              <p className="text-sm font-semibold text-brand-dark">
                {user?.name ?? 'Usuário'}
              </p>

              <p className="text-xs text-gray-400">
                {user ? roleLabels[user.role] : ''}
              </p>

            </div>

          </div>

          <div className="h-9 w-px bg-gray-200" />

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={leaving}
            title="Sair do sistema"
            aria-label="Sair do sistema"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-60"
          >

            {leaving ? (
              <LoaderCircle
                size={20}
                className="animate-spin"
              />
            ) : (
              <LogOut size={20} />
            )}

            <span className="hidden md:inline">
              {leaving ? 'Saindo...' : 'Sair'}
            </span>

          </button>

        </div>

      </div>

      {error && (
        <p
          role="alert"
          className="bg-red-50 px-4 py-2 text-right text-xs text-red-600"
        >
          {error}
        </p>
      )}

    </header>
  )
}
