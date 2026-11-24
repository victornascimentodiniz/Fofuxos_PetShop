
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import type { FormEvent } from 'react'

import { NavLink, useLocation } from 'react-router-dom'

import {
  Layers3,
  Tag,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Archive,
  Package,
  Pencil,
  Power,
  X,
  LoaderCircle,
  AlertCircle,
  AlertTriangle,
  Check,
} from 'lucide-react'

import { usePermissions } from '../hooks/usePermissions'

import { catalogService } from '../services/catalog.service'

import { getApiError } from '../services/management.service'

import type {
  CatalogType,
  CatalogItem,
  CatalogStatus,
} from '../types/catalog'

import '../styles/catalog.css'

type ModalMode = 'create' | 'edit' | null

const LABELS = {
  categories: {
    singular: 'categoria',
    plural: 'Categorias',
    icon: Layers3,
  },

  brands: {
    singular: 'marca',
    plural: 'Marcas',
    icon: Tag,
  },
}

function CatalogContent({
  type,
}: {
  type: CatalogType
}) {
  const { hasPermission } = usePermissions()

  const config = LABELS[type]
  const CatalogIcon = config.icon

  const canCreate = hasPermission(`${type}.create`)
  const canUpdate = hasPermission(`${type}.update`)
  const canStatus = hasPermission(`${type}.status`)

  const [items, setItems] = useState<CatalogItem[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] =
    useState<CatalogStatus>('all')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalError, setModalError] = useState('')

  const [modal, setModal] =
    useState<ModalMode>(null)

  const [selected, setSelected] =
    useState<CatalogItem | null>(null)

  const [statusTarget, setStatusTarget] =
    useState<CatalogItem | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // ==========================================
  // CARREGAR REGISTROS
  // ==========================================

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await catalogService.findAll(type)

      setItems(data)
    } catch (error) {
      setError(getApiError(error))
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  // ==========================================
  // NOTIFICACOES
  // ==========================================

  useEffect(() => {
    if (!success) return

    const timer = window.setTimeout(() => {
      setSuccess('')
    }, 4000)

    return () => window.clearTimeout(timer)
  }, [success])

  // ==========================================
  // FILTROS E INDICADORES
  // ==========================================

  const total = items.length

  const activeCount = items.filter(
    (item) => item.active,
  ).length

  const inactiveCount = total - activeCount

  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

  const filteredItems = useMemo(() => {
    const term = normalize(search.trim())

    return items.filter((item) => {
      const matchesSearch =
        !term ||
        normalize(item.name).includes(term) ||
        normalize(item.description ?? '').includes(term)

      const matchesStatus =
        status === 'all' ||
        (status === 'active' && item.active) ||
        (status === 'inactive' && !item.active)

      return matchesSearch && matchesStatus
    })
  }, [items, search, status])

  // ==========================================
  // ABRIR FORMULARIOS
  // ==========================================

  function openCreate() {
    if (!canCreate) return

    setSelected(null)
    setName('')
    setDescription('')
    setModalError('')
    setModal('create')
  }

  function openEdit(item: CatalogItem) {
    if (!canUpdate) return

    setSelected(item)
    setName(item.name)
    setDescription(item.description ?? '')
    setModalError('')
    setModal('edit')
  }

  function closeModal() {
    if (saving) return

    setModal(null)
    setSelected(null)
    setStatusTarget(null)
    setModalError('')
  }

  // ==========================================
  // CADASTRAR E EDITAR
  // ==========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (saving) return

    if (modal === 'create' && !canCreate) return
    if (modal === 'edit' && !canUpdate) return

    setModalError('')

    const normalizedName =
      name.trim().replace(/\s+/g, ' ')

    if (normalizedName.length < 2) {
      setModalError(
        'Informe um nome com pelo menos 2 caracteres.',
      )
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: normalizedName,
        description: description.trim() || null,
      }

      if (modal === 'create') {
        await catalogService.create(type, payload)

        setSuccess('Cadastro realizado com sucesso!')
      } else if (modal === 'edit' && selected) {
        await catalogService.update(
          type,
          selected.id,
          payload,
        )

        setSuccess('Cadastro atualizado com sucesso!')
      } else {
        return
      }

      setModal(null)
      setSelected(null)

      await loadItems()
    } catch (error) {
      setModalError(getApiError(error))
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // ATIVAR E DESATIVAR
  // ==========================================

  function confirmStatus(item: CatalogItem) {
    if (!canStatus) return

    setStatusTarget(item)
    setModalError('')
  }

  async function handleUpdateStatus() {
    if (!statusTarget || saving || !canStatus) return

    setSaving(true)
    setModalError('')

    try {
      const nextStatus = !statusTarget.active

      await catalogService.updateStatus(
        type,
        statusTarget.id,
        nextStatus,
      )

      setSuccess(
        nextStatus
          ? 'Cadastro ativado com sucesso!'
          : 'Cadastro desativado com sucesso!',
      )

      setStatusTarget(null)

      await loadItems()
    } catch (error) {
      setModalError(getApiError(error))
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <div className="catalog-page">

      {/* CABECALHO */}

      <header className="catalog-header">

        <div className="catalog-heading">

          <span className="catalog-breadcrumb">
            Cadastros / Organização de produtos
          </span>

          <h1>Categorias e marcas</h1>

          <p>
            Organize seu catálogo e facilite
            o gerenciamento de produtos.
          </p>

        </div>

        <div className="catalog-header-actions">

          <button
            type="button"
            className="catalog-button catalog-button-secondary"
            onClick={() => void loadItems()}
            disabled={loading || saving}
          >
            <RefreshCw
              size={17}
              className={loading ? 'catalog-spin' : ''}
            />
            Atualizar
          </button>

          {canCreate && (
            <button
              type="button"
              className="catalog-button catalog-button-primary"
              onClick={openCreate}
            >
              <Plus size={19} />

              Nova {config.singular}
            </button>
          )}

        </div>

      </header>

      {/* ABAS */}

      <nav
        className="catalog-tabs"
        aria-label="Cadastros do catálogo"
      >

        {hasPermission('categories.view') && (
          <NavLink
            to="/categorias"
            className={({ isActive }) =>
              `catalog-tab ${isActive ? 'catalog-tab-active' : ''}`
            }
          >
            <Layers3 size={19} />
            Categorias
          </NavLink>
        )}

        {hasPermission('brands.view') && (
          <NavLink
            to="/marcas"
            className={({ isActive }) =>
              `catalog-tab ${isActive ? 'catalog-tab-active' : ''}`
            }
          >
            <Tag size={19} />
            Marcas
          </NavLink>
        )}

      </nav>

      {/* INDICADORES */}

      <div className="catalog-stats">

        <article className="catalog-stat-card">

          <div className="catalog-stat-icon catalog-icon-pink">
            <CatalogIcon size={24} />
          </div>

          <div>
            <span>Total de {config.plural.toLowerCase()}</span>
            <strong>{loading ? '—' : total}</strong>
            <small>Registros cadastrados</small>
          </div>

        </article>

        <article className="catalog-stat-card">

          <div className="catalog-stat-icon catalog-icon-green">
            <CheckCircle2 size={24} />
          </div>

          <div>
            <span>{config.plural} ativas</span>
            <strong>{loading ? '—' : activeCount}</strong>
            <small>Disponíveis para utilização</small>
          </div>

        </article>

        <article className="catalog-stat-card">

          <div className="catalog-stat-icon catalog-icon-gray">
            <Archive size={24} />
          </div>

          <div>
            <span>{config.plural} inativas</span>
            <strong>{loading ? '—' : inactiveCount}</strong>
            <small>Cadastros desativados</small>
          </div>

        </article>

      </div>

      {/* ALERTAS */}

      {error && (
        <div className="catalog-alert catalog-alert-error" role="alert">
          <AlertCircle size={20} />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Fechar mensagem"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="catalog-alert catalog-alert-success" role="status">
          <CheckCircle2 size={20} />
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess('')}
            aria-label="Fechar mensagem"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* LISTAGEM */}

      <section className="catalog-table-card">

        <div className="catalog-table-heading">
          <div>
            <h2>{config.plural} cadastradas</h2>
            <p>Consulte e gerencie os registros.</p>
          </div>
        </div>

        <div className="catalog-filters">

          <div className="catalog-search">
            <Search size={19} />

            <input
              type="search"
              placeholder={`Pesquisar ${config.plural.toLowerCase()}...`}
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              aria-label="Pesquisar registros"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar pesquisa"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as CatalogStatus,
              )
            }
            aria-label="Filtrar situação"
          >
            <option value="all">Todas as situações</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>

        </div>

        {loading ? (
          <div className="catalog-empty">
            <LoaderCircle
              size={35}
              className="catalog-spin"
            />

            <h3>Carregando registros...</h3>
            <p>Aguarde enquanto consultamos o servidor.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="catalog-empty">

            <div className="catalog-empty-icon">
              <CatalogIcon size={30} />
            </div>

            <h3>Nenhum registro encontrado</h3>

            <p>
              {search || status !== 'all'
                ? 'Experimente alterar os filtros de pesquisa.'
                : error
                  ? 'Não foi possível consultar os registros.'
                  : `Cadastre sua primeira ${config.singular} para começar.`}
            </p>

            {!search &&
              status === 'all' &&
              !error &&
              canCreate && (
                <button
                  type="button"
                  className="catalog-button catalog-button-primary"
                  onClick={openCreate}
                >
                  <Plus size={18} />
                  Nova {config.singular}
                </button>
              )}

          </div>
        ) : (
          <div className="catalog-table-scroll">

            <table className="catalog-table">

              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Produtos vinculados</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>

                {filteredItems.map((item) => (
                  <tr key={item.id}>

                    <td>
                      <div className="catalog-item">

                        <div className="catalog-item-icon">
                          <CatalogIcon size={20} />
                        </div>

                        <div className="catalog-item-info">
                          <strong>{item.name}</strong>

                          <span>
                            {item.description ||
                              'Sem descrição'}
                          </span>
                        </div>

                      </div>
                    </td>

                    <td>
                      <span className="catalog-product-count">
                        <Package size={16} />
                        {item.productsCount}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          item.active
                            ? 'catalog-status catalog-status-active'
                            : 'catalog-status catalog-status-inactive'
                        }
                      >
                        <span />
                        {item.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>

                    <td>
                      <div className="catalog-row-actions">

                        {canUpdate && (
                          <button
                            type="button"
                            className="catalog-action-edit"
                            title="Editar cadastro"
                            aria-label={`Editar ${item.name}`}
                            onClick={() => openEdit(item)}
                          >
                            <Pencil size={17} />
                          </button>
                        )}

                        {canStatus && (
                          <button
                            type="button"
                            className={
                              item.active
                                ? 'catalog-action-disable'
                                : 'catalog-action-enable'
                            }
                            title={
                              item.active
                                ? 'Desativar'
                                : 'Ativar'
                            }
                            aria-label={`${item.active ? 'Desativar' : 'Ativar'} ${item.name}`}
                            onClick={() => confirmStatus(item)}
                          >
                            <Power size={17} />
                          </button>
                        )}

                        {!canUpdate && !canStatus && (
                          <span className="catalog-muted">
                            Somente leitura
                          </span>
                        )}

                      </div>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

        <footer className="catalog-table-footer">
          Exibindo {filteredItems.length} de {total} registros
        </footer>

      </section>

      {/* MODAL DE CADASTRO E EDICAO */}

      {modal && (
        <div className="catalog-modal-overlay">

          <section
            className="catalog-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-modal-title"
          >

            <header className="catalog-modal-header">

              <div className="catalog-modal-icon">
                <CatalogIcon size={24} />
              </div>

              <button
                type="button"
                className="catalog-close"
                disabled={saving}
                onClick={closeModal}
                aria-label="Fechar formulário"
              >
                <X size={22} />
              </button>

            </header>

            <div className="catalog-modal-title">

              <h2 id="catalog-modal-title">
                {modal === 'create'
                  ? `Nova ${config.singular}`
                  : `Editar ${config.singular}`}
              </h2>

              <p>
                Preencha as informações do cadastro.
              </p>

            </div>

            {modalError && (
              <div className="catalog-alert catalog-alert-error" role="alert">
                <AlertCircle size={18} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              <div className="catalog-form-field">

                <label htmlFor="catalog-name">
                  Nome da {config.singular}
                  <span> *</span>
                </label>

                <input
                  id="catalog-name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder={
                    type === 'categories'
                      ? 'Ex.: Rações'
                      : 'Ex.: Golden'
                  }
                  maxLength={100}
                  minLength={2}
                  autoFocus
                  required
                  disabled={saving}
                />

                <small>{name.length}/100 caracteres</small>

              </div>

              <div className="catalog-form-field">

                <label htmlFor="catalog-description">
                  Descrição
                </label>

                <textarea
                  id="catalog-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Informe uma descrição complementar..."
                  maxLength={1000}
                  rows={4}
                  disabled={saving}
                />

                <small>
                  {description.length}/1000 caracteres
                </small>

              </div>

              <div className="catalog-form-note">
                <AlertCircle size={17} />

                <span>
                  Os cadastros ativos estarão disponíveis
                  para vinculação aos produtos.
                </span>
              </div>

              <div className="catalog-modal-footer">

                <button
                  type="button"
                  className="catalog-button catalog-button-secondary"
                  disabled={saving}
                  onClick={closeModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="catalog-button catalog-button-primary"
                  disabled={saving || name.trim().length < 2}
                >
                  {saving ? (
                    <LoaderCircle
                      size={18}
                      className="catalog-spin"
                    />
                  ) : (
                    <Check size={18} />
                  )}

                  {saving
                    ? 'Salvando...'
                    : 'Salvar cadastro'}
                </button>

              </div>

            </form>

          </section>

        </div>
      )}

      {/* MODAL DE CONFIRMACAO */}

      {statusTarget && (
        <div className="catalog-modal-overlay">

          <section
            className="catalog-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-status-title"
          >

            <header className="catalog-modal-header">

              <div
                className={
                  statusTarget.active
                    ? 'catalog-modal-icon catalog-warning-icon'
                    : 'catalog-modal-icon catalog-success-icon'
                }
              >
                {statusTarget.active ? (
                  <AlertTriangle size={25} />
                ) : (
                  <CheckCircle2 size={25} />
                )}
              </div>

              <button
                type="button"
                className="catalog-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Fechar confirmação"
              >
                <X size={22} />
              </button>

            </header>

            <div className="catalog-modal-title">

              <h2 id="catalog-status-title">
                {statusTarget.active
                  ? 'Desativar cadastro?'
                  : 'Ativar cadastro?'}
              </h2>

              <p>
                Você deseja realmente{' '}
                {statusTarget.active ? 'desativar' : 'ativar'}{' '}
                <strong>{statusTarget.name}</strong>?
              </p>

            </div>

            {statusTarget.active && (
              <div className="catalog-form-note">

                <AlertTriangle size={18} />

                <span>
                  O histórico será preservado.
                  Cadastros vinculados a produtos ativos
                  não poderão ser desativados.
                </span>

              </div>
            )}

            {modalError && (
              <div className="catalog-alert catalog-alert-error" role="alert">
                <AlertCircle size={18} />
                <span>{modalError}</span>
              </div>
            )}

            <div className="catalog-modal-footer">

              <button
                type="button"
                className="catalog-button catalog-button-secondary"
                disabled={saving}
                onClick={closeModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={
                  statusTarget.active
                    ? 'catalog-button catalog-button-danger'
                    : 'catalog-button catalog-button-success'
                }
                disabled={saving}
                onClick={() => void handleUpdateStatus()}
              >
                {saving && (
                  <LoaderCircle
                    size={18}
                    className="catalog-spin"
                  />
                )}

                Confirmar

              </button>

            </div>

          </section>

        </div>
      )}

    </div>
  )
}

export default function Catalog() {
  const location = useLocation()

  const type: CatalogType =
    location.pathname === '/marcas'
      ? 'brands'
      : 'categories'

  return (
    <CatalogContent
      key={type}
      type={type}
    />
  )
}
