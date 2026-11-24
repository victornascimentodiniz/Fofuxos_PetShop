
import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import type { FormEvent } from 'react'

import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Pencil,
  KeyRound,
  ShieldCheck,
  X,
  Save,
  LoaderCircle,
  Eye,
  EyeOff,
} from 'lucide-react'

import { useAuth } from '../hooks/useAuth'

import {
  usePermissions,
} from '../hooks/usePermissions'

import {
  managementService,
  getApiError,
} from '../services/management.service'

import type {
  ManagedUser,
  AvailableProfile,
} from '../types/management'

export default function Users() {
  const { user: currentUser } = useAuth()

  const { hasPermission } =
    usePermissions()

  const canAssign =
    hasPermission('users.assign_profile')

  const [users, setUsers] =
    useState<ManagedUser[]>([])

  const [profiles, setProfiles] =
    useState<AvailableProfile[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [modal, setModal] =
    useState<'create' | 'edit' | 'password' | null>(
      null
    )

  const [editing, setEditing] =
    useState<ManagedUser | null>(null)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [confirmPassword, setConfirmPassword] =
    useState('')

  const [profileId, setProfileId] =
    useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const usersData =
        await managementService.getUsers()

      setUsers(usersData)

      if (canAssign) {
        const profilesData =
          await managementService.getAvailableProfiles()

        setProfiles(profilesData)
      } else {
        setProfiles([])
      }
    } catch (error) {
      setError(getApiError(error))
    } finally {
      setLoading(false)
    }
  }, [canAssign])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function clearForm() {
    setName('')
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setProfileId('')
    setShowPassword(false)
    setError('')
    setSuccess('')
    setEditing(null)
  }

  function openCreate() {
    clearForm()
    setModal('create')
  }

  function openEdit(user: ManagedUser) {
    clearForm()

    setEditing(user)
    setName(user.name)
    setUsername(user.username)
    setProfileId(user.profileId ?? '')

    setModal('edit')
  }

  function openReset(user: ManagedUser) {
    clearForm()
    setEditing(user)
    setModal('password')
  }

  function closeModal() {
    if (saving) return

    setPassword('')
    setConfirmPassword('')
    setError('')
    setModal(null)
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (saving) return

    setError('')
    setSuccess('')

    if (
      modal !== 'edit' &&
      password !== confirmPassword
    ) {
      setError('As senhas não conferem.')
      return
    }

    setSaving(true)

    try {
      if (modal === 'create') {
        await managementService.createUser({
          name,
          username,
          password,
          profileId,
        })
      }

      if (modal === 'edit' && editing) {
        await managementService.updateUser(
          editing.id,
          { name, username, profileId }
        )
      }

      if (modal === 'password' && editing) {
        await managementService.resetPassword(
          editing.id,
          password
        )
      }

      setPassword('')
      setConfirmPassword('')
      setModal(null)

      setSuccess(
        'Operação realizada com sucesso!'
      )

      await loadData()
    } catch (error) {
      setError(getApiError(error))
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(user: ManagedUser) {
    if (!window.confirm(
      `Deseja ${user.active ? 'desativar' : 'ativar'} o usuário ${user.name}?`
    )) return

    setError('')
    setSuccess('')

    try {
      await managementService.updateUserStatus(
        user.id,
        !user.active
      )

      setSuccess('Situação atualizada com sucesso.')

      await loadData()
    } catch (error) {
      setError(getApiError(error))
    }
  }

  function canManage(user: ManagedUser) {
    if (
      user.profile?.isSystem &&
      !currentUser?.profile.isSystem
    ) {
      return false
    }

    return true
  }

  const selectedProfile = profiles.find(
    (profile) => profile.id === profileId
  )

  const filtered = users.filter((user) => {
    const matchesSearch =
      `${user.name} ${user.username} ${user.profile?.name ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase())

    const matchesStatus =
      status === 'all' ||
      (status === 'active' && user.active) ||
      (status === 'inactive' && !user.active)

    return matchesSearch && matchesStatus
  })

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#AD4679]'

  const buttonClass =
    'rounded-xl bg-[#AD4679] px-4 py-3 text-sm font-semibold text-white hover:bg-[#913960] disabled:opacity-50'

  return (
    <div className="space-y-6 p-4 md:p-7">

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#20252B]">
            Usuários
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Gerencie os funcionários e seus acessos.
          </p>
        </div>

        {hasPermission('users.create') &&
          canAssign && (
          <button
            onClick={openCreate}
            className={`${buttonClass} flex items-center gap-2`}
          >
            <UserPlus size={19} />
            Novo usuário
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Total de usuários', users.length],
          [
            'Usuários ativos',
            users.filter((user) => user.active).length,
          ],
          [
            'Usuários inativos',
            users.filter((user) => !user.active).length,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <UsersIcon
              size={24}
              className="mb-3 text-[#AD4679]"
            />

            <p className="text-sm text-gray-500">
              {label}
            </p>

            <p className="mt-2 text-3xl font-bold">
              {value}
            </p>
          </div>
        ))}
      </div>

      {error && !modal && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">

        <div className="flex flex-wrap gap-3 border-b border-gray-100 p-4">

          <div className="relative min-w-48 flex-1">

            <Search
              size={18}
              className="absolute left-3 top-3.5 text-gray-400"
            />

            <input
              placeholder="Pesquisar usuário..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className={`${inputClass} pl-10`}
            />

          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>

        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <LoaderCircle
              className="animate-spin text-[#AD4679]"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  {[
                    'Funcionário',
                    'Perfil',
                    'Situação',
                    'Último acesso',
                    'Ações',
                  ].map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-5 py-4 font-semibold"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">

                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50"
                  >

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F8E8F0] font-bold text-[#AD4679]">
                          {user.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className="font-semibold">
                            {user.name}
                          </p>

                          <p className="text-xs text-gray-500">
                            {user.username}
                          </p>

                          {user.mustChangePassword && (
                            <p className="mt-1 text-xs text-amber-600">
                              Senha temporária
                            </p>
                          )}
                        </div>

                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      {user.profile?.name ??
                        'Sem perfil'}
                    </td>

                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs ${
                        user.active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.active
                          ? 'Ativo'
                          : 'Inativo'}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                      {user.lastLoginAt
                        ? new Date(
                            user.lastLoginAt
                          ).toLocaleString('pt-BR')
                        : 'Nunca acessou'}
                    </td>

                    <td className="px-5 py-4">

                      {canManage(user) && (
                        <div className="flex items-center gap-4">

                          {hasPermission('users.update') && (
                            <button
                              title="Editar usuário"
                              aria-label="Editar usuário"
                              onClick={() =>
                                openEdit(user)
                              }
                              className="text-[#AD4679]"
                            >
                              <Pencil size={17} />
                            </button>
                          )}

                          {hasPermission('users.reset_password') &&
                            currentUser?.id !== user.id && (
                            <button
                              title="Redefinir senha"
                              aria-label="Redefinir senha"
                              onClick={() =>
                                openReset(user)
                              }
                              className="text-[#AD4679]"
                            >
                              <KeyRound size={17} />
                            </button>
                          )}

                          {hasPermission('users.status') &&
                            currentUser?.id !== user.id && (
                            <button
                              onClick={() =>
                                void changeStatus(user)
                              }
                              className="text-xs text-gray-600"
                            >
                              {user.active
                                ? 'Desativar'
                                : 'Ativar'}
                            </button>
                          )}

                        </div>
                      )}

                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center text-gray-500"
                    >
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}

              </tbody>
            </table>

          </div>
        )}

        <div className="border-t border-gray-100 p-4 text-xs text-gray-500">
          {filtered.length} usuário(s) encontrado(s)
        </div>

      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <form
            onSubmit={handleSubmit}
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >

            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <h2 className="text-xl font-bold">
                {modal === 'create'
                  ? 'Novo usuário'
                  : modal === 'edit'
                    ? 'Editar usuário'
                    : 'Redefinir senha'}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-5">

              {error && (
                <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              {modal !== 'password' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Nome completo
                    </label>

                    <input
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      required
                      minLength={3}
                      maxLength={120}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Usuário de acesso
                    </label>

                    <input
                      value={username}
                      onChange={(event) =>
                        setUsername(
                          event.target.value.toLowerCase()
                        )
                      }
                      required
                      minLength={3}
                      maxLength={50}
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              {modal === 'password' && (
                <div className="rounded-xl bg-gray-50 p-4 text-sm">
                  Redefinindo a senha de:
                  <strong className="ml-2">
                    {editing?.name}
                  </strong>
                </div>
              )}

              {modal !== 'edit' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Senha temporária
                    </label>

                    <div className="relative">
                      <input
                        type={showPassword
                          ? 'text'
                          : 'password'}
                        value={password}
                        onChange={(event) =>
                          setPassword(event.target.value)
                        }
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
                        required
                        className={`${inputClass} pr-12`}
                      />

                      <button
                        type="button"
                        aria-label="Mostrar ou ocultar senha"
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                        className="absolute right-4 top-3.5 text-gray-400"
                      >
                        {showPassword
                          ? <EyeOff size={19} />
                          : <Eye size={19} />}
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      Mínimo de 12 caracteres.
                    </p>

                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Confirmar senha
                    </label>

                    <input
                      type={showPassword
                        ? 'text'
                        : 'password'}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value
                        )
                      }
                      required
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              {modal !== 'password' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Perfil de acesso
                    </label>

                    <select
                      required
                      value={profileId}
                      disabled={
                        !canAssign ||
                        editing?.id === currentUser?.id
                      }
                      onChange={(event) =>
                        setProfileId(event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="">
                        Selecione um perfil
                      </option>

                      {editing?.profile &&
                        !profiles.some(
                          (profile) =>
                            profile.id === editing.profileId
                        ) && (
                          <option value={editing.profile.id}>
                            {editing.profile.name}
                          </option>
                        )}

                      {profiles.map((profile) => (
                        <option
                          key={profile.id}
                          value={profile.id}
                        >
                          {profile.name}
                        </option>
                      ))}

                    </select>
                  </div>

                  {selectedProfile && (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">

                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <ShieldCheck size={19} />
                        {selectedProfile.permissions.length} permissões concedidas
                      </div>

                      <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                        {selectedProfile.permissions.map(
                          (permission) => (
                            <p
                              key={permission.id}
                              className="text-xs text-emerald-800"
                            >
                              ✓ {permission.name}
                            </p>
                          )
                        )}
                      </div>

                    </div>
                  )}
                </>
              )}

              {modal !== 'edit' && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                  O usuário deverá alterar a senha temporária no próximo acesso.
                </p>
              )}

            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 p-5">

              <button
                type="button"
                disabled={saving}
                onClick={closeModal}
                className="rounded-xl border border-gray-200 px-4 py-3 text-sm"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className={`${buttonClass} flex items-center gap-2`}
              >
                <Save size={18} />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>

            </div>

          </form>
        </div>
      )}

    </div>
  )
}
