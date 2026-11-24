
import { useState } from 'react'

import type { FormEvent } from 'react'

import { useNavigate } from 'react-router-dom'

import {
  LockKeyhole,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'

import api from '../services/api'

import {
  getApiError,
} from '../services/management.service'

import { useAuth } from '../hooks/useAuth'

export default function ChangePassword() {
  const navigate = useNavigate()

  const {
    user,
    logout,
    refreshSession,
  } = useAuth()

  const [currentPassword, setCurrentPassword] =
    useState('')

  const [newPassword, setNewPassword] =
    useState('')

  const [confirmation, setConfirmation] =
    useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (saving) return

    setError('')

    // Validação dos campos
    if (
      !currentPassword ||
      !newPassword ||
      !confirmation
    ) {
      setError('Preencha todos os campos.')
      return
    }

    if (newPassword.length < 12) {
      setError(
        'A nova senha deve possuir pelo menos 12 caracteres.'
      )
      return
    }

    if (newPassword !== confirmation) {
      setError('As senhas não conferem.')
      return
    }

    if (currentPassword === newPassword) {
      setError(
        'A nova senha deve ser diferente da senha atual.'
      )
      return
    }

    setSaving(true)

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      })

      // Limpa as senhas informadas
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')

      // Atualiza o contexto após encerrar a sessão
      await refreshSession()

      navigate('/login', {
        replace: true,
      })
    } catch (error) {
      setError(getApiError(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()

      navigate('/login', {
        replace: true,
      })
    } catch (error) {
      setError(getApiError(error))
    }
  }

  const inputClass = `
    w-full rounded-xl border border-gray-200
    bg-white px-4 py-3 text-sm outline-none
    transition-colors focus:border-brand-primary
    focus:ring-4 focus:ring-brand-primary/10
    disabled:opacity-60
  `

  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-background p-5">

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-2xl border border-gray-200 bg-white p-7 shadow-sm"
      >

        {/* Ícone principal */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F8E8F0] text-brand-primary">

          <LockKeyhole size={32} />

        </div>

        {/* Título */}
        <div className="text-center">

          <h1 className="text-2xl font-bold text-brand-dark">
            Altere sua senha
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            {user?.mustChangePassword
              ? `Olá, ${user.name}! Por segurança, você precisa definir uma nova senha antes de acessar o sistema.`
              : 'Defina uma nova senha para sua conta.'}
          </p>

        </div>

        {/* Mensagem de erro */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600"
          >

            <AlertCircle
              size={20}
              className="shrink-0"
            />

            <span>{error}</span>

          </div>
        )}

        {/* Senha atual */}
        <div>

          <label
            htmlFor="currentPassword"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Senha atual
          </label>

          <div className="relative">

            <input
              id="currentPassword"
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(event.target.value)
              }
              placeholder="Digite sua senha atual"
              required
              maxLength={128}
              disabled={saving}
              autoComplete="current-password"
              className={`${inputClass} pr-12`}
            />

            <button
              type="button"
              aria-label={
                showPassword
                  ? 'Ocultar senhas'
                  : 'Mostrar senhas'
              }
              onClick={() =>
                setShowPassword((value) => !value)
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary"
            >
              {showPassword
                ? <EyeOff size={20} />
                : <Eye size={20} />}
            </button>

          </div>

        </div>

        {/* Nova senha */}
        <div>

          <label
            htmlFor="newPassword"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Nova senha
          </label>

          <input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(event) =>
              setNewPassword(event.target.value)
            }
            placeholder="Digite sua nova senha"
            required
            minLength={12}
            maxLength={128}
            disabled={saving}
            autoComplete="new-password"
            className={inputClass}
          />

        </div>

        {/* Confirmar senha */}
        <div>

          <label
            htmlFor="confirmation"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Confirmar nova senha
          </label>

          <input
            id="confirmation"
            type={showPassword ? 'text' : 'password'}
            value={confirmation}
            onChange={(event) =>
              setConfirmation(event.target.value)
            }
            placeholder="Confirme sua nova senha"
            required
            minLength={12}
            maxLength={128}
            disabled={saving}
            autoComplete="new-password"
            className={inputClass}
          />

        </div>

        {/* Orientações de segurança */}
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4">

          <ShieldCheck
            size={20}
            className="shrink-0 text-emerald-600"
          />

          <div className="space-y-1 text-xs text-emerald-700">

            <p>Utilize pelo menos 12 caracteres.</p>

            <p>
              A nova senha deve ser diferente da atual.
            </p>

            <p>
              Você precisará entrar novamente após
              alterar sua senha.
            </p>

          </div>

        </div>

        {/* Botão salvar */}
        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3.5 font-semibold text-white transition-colors hover:bg-brand-primary-dark disabled:opacity-60"
        >

          {saving ? (
            <>
              <LoaderCircle
                size={20}
                className="animate-spin"
              />

              Alterando senha...
            </>
          ) : (
            'Alterar senha'
          )}

        </button>

        {/* Encerrar sessão */}
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleLogout()}
          className="w-full text-sm font-medium text-gray-500 hover:text-brand-primary"
        >
          Sair do sistema
        </button>

      </form>

    </main>
  )
}
