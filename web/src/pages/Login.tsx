
import { useState } from 'react'
import type { FormEvent } from 'react'

import axios from 'axios'

import { useNavigate } from 'react-router-dom'

import {
  PawPrint,
  UserRound,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
} from 'lucide-react'

import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const navigate = useNavigate()

  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] = useState('')

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (submitting) return

    setError('')

    if (!username.trim() || !password) {
      setError('Preencha todos os campos.')
      return
    }

    setSubmitting(true)

    try {
      const user = await login({
        username: username.trim().toLowerCase(),
        password,
      })

      setPassword('')

      navigate(
        user.role === 'OPERATOR' ? '/caixa' : '/',
        { replace: true }
      )
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status

        if (status === 401) {
          setError('Usuário ou senha inválidos.')
        } else if (status === 429) {
          setError(
            'Muitas tentativas de acesso. Aguarde um minuto.'
          )
        } else if (!error.response) {
          setError(
            'Não foi possível conectar ao servidor. Verifique se a API está funcionando.'
          )
        } else {
          setError(
            'Não foi possível realizar o login. Tente novamente.'
          )
        }
      } else {
        setError('Ocorreu um erro inesperado.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh bg-brand-background">

      {/* Identidade visual */}
      <section className="relative hidden w-[46%] flex-col items-center justify-center overflow-hidden bg-brand-dark px-12 text-center lg:flex">

        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-brand-primary/10" />

        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-secondary/10" />

        <div className="relative z-10">

          <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-brand-secondary/10">

            <PawPrint
              size={68}
              strokeWidth={1.6}
              className="text-brand-secondary"
            />

          </div>

          <h1 className="text-6xl font-bold tracking-tight text-[#D881AD]">
            Fofuxos
          </h1>

          <p className="mt-4 text-sm font-semibold tracking-[0.35em] text-brand-secondary">
            SISTEMA DE GESTÃO
          </p>

          <div className="mx-auto my-10 h-0.5 w-16 bg-brand-secondary" />

          <h2 className="text-2xl font-semibold text-white">
            Seu negócio em boas mãos.
          </h2>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-400">
            Gerencie suas vendas, estoque e finanças
            de maneira simples, segura e organizada.
          </p>

        </div>

        <p className="absolute bottom-8 text-xs tracking-wider text-gray-500">
          FOFUXOS GESTÃO • PROJETO INTEGRADOR
        </p>

      </section>

      {/* Formulário */}
      <section className="relative flex flex-1 items-center justify-center px-6 py-16 sm:px-12">

        <div className="w-full max-w-[420px]">

          <div className="mb-10 text-center lg:hidden">

            <PawPrint
              size={48}
              className="mx-auto mb-3 text-brand-secondary"
            />

            <h1 className="text-3xl font-bold text-brand-primary">
              Fofuxos
            </h1>

            <p className="mt-2 text-xs tracking-widest text-brand-secondary-dark">
              SISTEMA DE GESTÃO
            </p>

          </div>

          <div className="mb-8">

            <h2 className="text-4xl font-bold tracking-tight text-brand-dark">
              Bem-vindo!
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              Informe suas credenciais para acessar o sistema.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* Campo de usuário */}
            <div>

              <label
                htmlFor="username"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Usuário
              </label>

              <div className="relative">

                <UserRound
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  placeholder="Digite seu usuário"
                  autoComplete="username"
                  maxLength={50}
                  disabled={submitting}
                  autoFocus
                  required
                  className="h-13 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 text-sm outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 disabled:opacity-60"
                />

              </div>

            </div>

            {/* Campo de senha */}
            <div>

              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Senha
              </label>

              <div className="relative">

                <LockKeyhole
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  maxLength={128}
                  disabled={submitting}
                  required
                  className="h-13 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-12 text-sm outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  aria-label={
                    showPassword
                      ? 'Ocultar senha'
                      : 'Mostrar senha'
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary"
                >
                  {showPassword
                    ? <EyeOff size={20} />
                    : <Eye size={20} />
                  }
                </button>

              </div>

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

            {/* Botão de acesso */}
            <button
              type="submit"
              disabled={submitting}
              className="flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-brand-primary font-semibold text-white shadow-lg shadow-brand-primary/15 transition-colors hover:bg-brand-primary-dark disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoaderCircle
                    size={20}
                    className="animate-spin"
                  />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar no sistema
                  <ArrowRight size={20} />
                </>
              )}
            </button>

          </form>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500">

            <ShieldCheck
              size={17}
              className="text-brand-secondary-dark"
            />

            Sistema de acesso local

          </div>

        </div>

        <p className="absolute bottom-5 text-xs text-gray-400">
          Fofuxos Gestão • Versão 0.1.0
        </p>

      </section>

    </main>
  )
}
