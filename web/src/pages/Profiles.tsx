
import {
  useEffect,
  useState,
  useCallback,
} from 'react'

import type { FormEvent } from 'react'

import {
  ShieldCheck,
  Search,
  Plus,
  Pencil,
  LockKeyhole,
  X,
  Save,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
} from 'lucide-react'

import {
  managementService,
  getApiError,
} from '../services/management.service'

import { usePermissions } from '../hooks/usePermissions'
import { useAuth } from '../hooks/useAuth'

import type {
  Profile,
  Permission,
} from '../types/management'

export default function Profiles() {
  const { hasPermission } = usePermissions()
  const { user } = useAuth()

  const [profiles, setProfiles] =
    useState<Profile[]>([])

  const [permissions, setPermissions] =
    useState<Permission[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const [modal, setModal] = useState(false)

  const [editing, setEditing] =
    useState<Profile | null>(null)

  const [formMode, setFormMode] =
    useState<'create' | 'details' | 'permissions'>(
      'create'
    )

  const [name, setName] = useState('')
  const [description, setDescription] =
    useState('')

  const [selected, setSelected] =
    useState<string[]>([])

  const [expanded, setExpanded] =
    useState<string[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const [profilesData, permissionsData] =
        await Promise.all([
          managementService.getProfiles(),
          managementService.getPermissions(),
        ])

      setProfiles(profilesData)
      setPermissions(permissionsData)
    } catch (error) {
      setError(getApiError(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const allowedPermissions =
    permissions.filter((permission) =>
      hasPermission(permission.code)
    )

  const grouped = allowedPermissions.reduce<
    Record<string, Permission[]>
  >((groups, permission) => {
    if (!groups[permission.module]) {
      groups[permission.module] = []
    }

    groups[permission.module].push(permission)

    return groups
  }, {})

  function canManage(profile: Profile) {
    return !profile.isSystem &&
      profile.permissions.every((permission) =>
        hasPermission(permission.code)
      )
  }

  function openCreate() {
    setEditing(null)
    setFormMode('create')
    setName('')
    setDescription('')
    setSelected([])
    setExpanded([])
    setError('')
    setSuccess('')
    setModal(true)
  }

  function openEdit(
    profile: Profile,
    mode: 'details' | 'permissions'
  ) {
    setEditing(profile)
    setFormMode(mode)
    setName(profile.name)
    setDescription(profile.description ?? '')

    setSelected(
      profile.permissions.map(
        (permission) => permission.code
      )
    )

    setExpanded([])
    setError('')
    setSuccess('')
    setModal(true)
  }

  function togglePermission(code: string) {
    setSelected((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code]
    )
  }

  function toggleModule(items: Permission[]) {
    const codes = items.map((item) => item.code)

    const allSelected = codes.every(
      (code) => selected.includes(code)
    )

    setSelected((current) =>
      allSelected
        ? current.filter(
            (code) => !codes.includes(code)
          )
        : [...new Set([...current, ...codes])]
    )
  }

  function toggleExpanded(module: string) {
    setExpanded((current) =>
      current.includes(module)
        ? current.filter(
            (item) => item !== module
          )
        : [...current, module]
    )
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (saving) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      if (formMode === 'create') {
        await managementService.createProfile({
          name,
          description,
          permissionCodes: selected,
        })
      } else if (
        editing &&
        formMode === 'details'
      ) {
        await managementService.updateProfile(
          editing.id,
          { name, description }
        )
      } else if (
        editing &&
        formMode === 'permissions'
      ) {
        await managementService.updatePermissions(
          editing.id,
          selected
        )
      }

      setModal(false)

      setSuccess(
        'Perfil salvo com sucesso!'
      )

      await loadData()
    } catch (error) {
      setError(getApiError(error))
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(profile: Profile) {
    const confirmed = window.confirm(
      `Deseja ${profile.active ? 'desativar' : 'ativar'} o perfil ${profile.name}?`
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    try {
      await managementService.updateProfileStatus(
        profile.id,
        !profile.active
      )

      setSuccess('Situação atualizada com sucesso.')

      await loadData()
    } catch (error) {
      setError(getApiError(error))
    }
  }

  const filtered = profiles.filter((profile) => {
    const matchesSearch =
      `${profile.name} ${profile.description ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase())

    const matchesStatus =
      status === 'all' ||
      (status === 'active' && profile.active) ||
      (status === 'inactive' && !profile.active)

    return matchesSearch && matchesStatus
  })

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#AD4679]'

  const buttonClass =
    'rounded-xl bg-[#AD4679] px-4 py-3 text-sm font-semibold text-white hover:bg-[#913960] disabled:opacity-50'

  const showPermissionEditor =
    formMode === 'permissions' ||
    (
      formMode === 'create' &&
      hasPermission('profiles.permissions')
    )

  return (
    <div className="space-y-6 p-4 md:p-7">

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>
          <h1 className="text-2xl font-bold text-[#20252B]">
            Perfis de acesso
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Gerencie os perfis e permissões do sistema.
          </p>
        </div>

        {hasPermission('profiles.create') && (
          <button
            onClick={openCreate}
            className={`${buttonClass} flex items-center gap-2`}
          >
            <Plus size={19} />
            Novo perfil
          </button>
        )}

      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Total de perfis', profiles.length],
          [
            'Perfis ativos',
            profiles.filter((p) => p.active).length,
          ],
          [
            'Permissões disponíveis',
            permissions.length,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <ShieldCheck
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

      <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-white p-4">

        <div className="relative min-w-48 flex-1">
          <Search
            size={18}
            className="absolute left-3 top-3.5 text-gray-400"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Pesquisar perfil..."
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
        <div className="grid gap-4 xl:grid-cols-2">

          {filtered.map((profile) => (
            <div
              key={profile.id}
              className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5"
            >

              <div className="flex items-start gap-3">

                <div className="rounded-xl bg-[#F8E8F0] p-3 text-[#AD4679]">
                  <ShieldCheck size={24} />
                </div>

                <div className="flex-1">
                  <h2 className="font-bold">
                    {profile.name}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {profile.description ||
                      'Sem descrição'}
                  </p>
                </div>

                <span className={`rounded-full px-3 py-1 text-xs ${
                  profile.active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {profile.active
                    ? 'Ativo'
                    : 'Inativo'}
                </span>

              </div>

              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#32B5A5]"
                  style={{
                    width: `${permissions.length
                      ? Math.min(
                          100,
                          profile.permissionsCount /
                          permissions.length * 100
                        )
                      : 0}%`,
                  }}
                />
              </div>

              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {profile.permissionsCount} permissões
                </span>

                <span>
                  {profile.usersCount} usuário(s)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">

                {profile.isSystem ? (
                  <span className="flex items-center gap-2 text-sm text-emerald-700">
                    <LockKeyhole size={16} />
                    Perfil protegido pelo sistema
                  </span>
                ) : canManage(profile) && (
                  <>
                    {hasPermission('profiles.update') && (
                      <button
                        onClick={() =>
                          openEdit(profile, 'details')
                        }
                        className="flex items-center gap-2 text-sm text-[#AD4679]"
                      >
                        <Pencil size={16} />
                        Editar
                      </button>
                    )}

                    {hasPermission('profiles.permissions') &&
                      user?.profileId !== profile.id && (
                      <button
                        onClick={() =>
                          openEdit(profile, 'permissions')
                        }
                        className="text-sm text-[#AD4679]"
                      >
                        Permissões
                      </button>
                    )}

                    {hasPermission('profiles.status') &&
                      (
                        !profile.active ||
                        user?.profileId !== profile.id
                      ) && (
                      <button
                        onClick={() =>
                          void changeStatus(profile)
                        }
                        className="ml-auto text-sm text-gray-600"
                      >
                        {profile.active
                          ? 'Desativar'
                          : 'Ativar'}
                      </button>
                    )}
                  </>
                )}

              </div>
            </div>
          ))}

          {!filtered.length && (
            <p className="p-6 text-sm text-gray-500">
              Nenhum perfil encontrado.
            </p>
          )}

        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <form
            onSubmit={handleSubmit}
            className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >

            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <h2 className="text-xl font-bold">
                  {formMode === 'create'
                    ? 'Novo perfil'
                    : formMode === 'details'
                      ? 'Editar perfil'
                      : `Permissões: ${editing?.name}`}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Fechar"
                disabled={saving}
                onClick={() => setModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-5">

              {error && (
                <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {formMode !== 'permissions' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Nome do perfil
                    </label>

                    <input
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      required
                      minLength={3}
                      maxLength={100}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Descrição
                    </label>

                    <textarea
                      value={description}
                      onChange={(event) =>
                        setDescription(event.target.value)
                      }
                      maxLength={500}
                      rows={3}
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              {showPermissionEditor && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">
                      Permissões ({selected.length})
                    </h3>

                    <div className="flex gap-4 text-sm">

                      <button
                        type="button"
                        onClick={() =>
                          setSelected(
                            allowedPermissions.map(
                              (item) => item.code
                            )
                          )
                        }
                        className="text-[#AD4679]"
                      >
                        Marcar todas
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelected([])}
                        className="text-gray-500"
                      >
                        Desmarcar todas
                      </button>

                    </div>
                  </div>

                  {Object.entries(grouped).map(
                    ([module, items]) => (
                      <div
                        key={module}
                        className="overflow-hidden rounded-xl border border-gray-200"
                      >

                        <div className="flex items-center gap-3 bg-gray-50 p-4">

                          <input
                            type="checkbox"
                            aria-label={`Selecionar módulo ${module}`}
                            checked={items.every(
                              (item) =>
                                selected.includes(
                                  item.code
                                )
                            )}
                            onChange={() =>
                              toggleModule(items)
                            }
                            className="h-4 w-4 accent-[#AD4679]"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              toggleExpanded(module)
                            }
                            className="flex flex-1 items-center justify-between text-sm font-semibold"
                          >
                            {module}

                            <span className="flex items-center gap-2 text-gray-400">
                              {
                                items.filter((item) =>
                                  selected.includes(
                                    item.code
                                  )
                                ).length
                              }/{items.length}

                              {expanded.includes(module)
                                ? <ChevronDown size={18} />
                                : <ChevronRight size={18} />}
                            </span>
                          </button>
                        </div>

                        {expanded.includes(module) && (
                          <div className="grid gap-4 p-4 md:grid-cols-2">
                            {items.map((permission) => (
                              <label
                                key={permission.id}
                                className="flex cursor-pointer items-center gap-3 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.includes(
                                    permission.code
                                  )}
                                  onChange={() =>
                                    togglePermission(
                                      permission.code
                                    )
                                  }
                                  className="h-4 w-4 accent-[#AD4679]"
                                />

                                {permission.name}
                              </label>
                            ))}
                          </div>
                        )}

                      </div>
                    )
                  )}
                </>
              )}

            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 p-5">

              <button
                type="button"
                disabled={saving}
                onClick={() => setModal(false)}
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
