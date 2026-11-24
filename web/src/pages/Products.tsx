
import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import { Link } from 'react-router-dom'

import {
  Package,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  AlertCircle,
  X,
  Layers3,
  Tag,
} from 'lucide-react'

import { usePermissions } from '../hooks/usePermissions'

import ProductForm from '../components/products/ProductForm'
import ProductConversionButton from '../components/products/ProductConversionButton'

import { productsService } from '../services/products.service'

import { getApiError } from '../services/management.service'

import type {
  Product,
  ProductInput,
  ProductOptions,
  ProductStats,
  ProductStatus,
  ProductSaleType,
  ProductPagination,
} from '../types/product'

import '../styles/catalog.css'
import '../styles/products.css'

const PAGE_SIZE = 20

const EMPTY_OPTIONS: ProductOptions = {
  categories: [],
  brands: [],
  units: [],
  saleTypes: [],
}

function money(value: string) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function stock(value: string, product: Product) {
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits:
      product.saleType === 'WEIGHT' ? 3 : 0,

    maximumFractionDigits:
      product.saleType === 'WEIGHT' ? 3 : 0,
  })
}

export default function Products() {
  const { hasPermission } = usePermissions()

  const canCreate =
    hasPermission('products.create') &&
    hasPermission('products.price')

  const canUpdate =
    hasPermission('products.update')

  const canStatus =
    hasPermission('products.status')

  const canViewCost =
    hasPermission('products.cost')

  const canChangePrice =
    hasPermission('products.price')

  const [products, setProducts] =
    useState<Product[]>([])

  const [options, setOptions] =
    useState<ProductOptions>(EMPTY_OPTIONS)

  const [stats, setStats] =
    useState<ProductStats | null>(null)

  const [optionsReady, setOptionsReady] =
    useState(false)

  const [loading, setLoading] = useState(true)
  const [statusSaving, setStatusSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] =
    useState('')

  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')

  const [saleType, setSaleType] =
    useState<ProductSaleType | ''>('')

  const [status, setStatus] =
    useState<ProductStatus>('all')

  const [page, setPage] = useState(1)

  const [pagination, setPagination] =
    useState<ProductPagination>({
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 0,
    })

  const [reload, setReload] = useState(0)

  const [listError, setListError] = useState('')
  const [metaError, setMetaError] = useState('')

  const [success, setSuccess] = useState('')

  const [modalOpen, setModalOpen] = useState(false)

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null)

  const [statusTarget, setStatusTarget] =
    useState<Product | null>(null)

  const [statusError, setStatusError] =
    useState('')

  // =========================================
  // PESQUISA COM DEBOUNCE
  // =========================================

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1)
      setDebouncedSearch(search.trim())
    }, 350)

    return () => window.clearTimeout(timer)
  }, [search])

  // =========================================
  // CARREGAR LISTAGEM
  // =========================================

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      setLoading(true)
      setListError('')

      try {
        const result =
          await productsService.findAll({
            search: debouncedSearch || undefined,

            categoryId: categoryId || undefined,
            brandId: brandId || undefined,

            saleType: saleType || undefined,
            status,

            page,
            limit: PAGE_SIZE,
          })

        if (cancelled) return

        const lastPage = Math.max(
          1,
          result.pagination.totalPages,
        )

        if (page > lastPage) {
          setPage(lastPage)
          return
        }

        setProducts(result.data)

        setPagination(result.pagination)
      } catch (error) {
        if (!cancelled) {
          setListError(getApiError(error))
          setProducts([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProducts()

    return () => {
      cancelled = true
    }
  }, [
    debouncedSearch,
    categoryId,
    brandId,
    saleType,
    status,
    page,
    reload,
  ])

  // =========================================
  // INDICADORES E OPCOES
  // =========================================

  useEffect(() => {
    let cancelled = false

    setMetaError('')
    setOptionsReady(false)

    async function loadMetadata() {
      try {
        const [statsData, optionsData] =
          await Promise.all([
            productsService.getStats(),
            productsService.getOptions(),
          ])

        if (!cancelled) {
          setStats(statsData)
          setOptions(optionsData)
          setOptionsReady(true)
        }
      } catch (error) {
        if (!cancelled) {
          setMetaError(getApiError(error))
          setStats(null)
        }
      }
    }

    void loadMetadata()

    return () => {
      cancelled = true
    }
  }, [reload])

  useEffect(() => {
    if (!success) return

    const timer = window.setTimeout(
      () => setSuccess(''),
      4500,
    )

    return () => window.clearTimeout(timer)
  }, [success])

  const refresh = useCallback(() => {
    setReload((value) => value + 1)
  }, [])

  // =========================================
  // CADASTRO E EDICAO
  // =========================================

  function openCreate() {
    if (!canCreate || !optionsReady) return

    setEditingProduct(null)
    setModalOpen(true)
  }

  function openEdit(product: Product) {
    if (!canUpdate || !optionsReady) return

    setEditingProduct(product)
    setModalOpen(true)
  }

  function closeForm() {
    setModalOpen(false)
    setEditingProduct(null)
  }

  async function saveProduct(data: ProductInput) {
    if (editingProduct) {
      await productsService.update(
        editingProduct.id,
        data,
      )

      setSuccess('Produto atualizado com sucesso!')
    } else {
      await productsService.create(data)

      setSuccess('Produto cadastrado com sucesso!')
    }

    closeForm()
    refresh()
  }

  // =========================================
  // ATIVACAO E DESATIVACAO
  // =========================================

  function openStatus(product: Product) {
    if (!canStatus) return

    setStatusTarget(product)
    setStatusError('')
  }

  async function changeStatus() {
    if (!statusTarget || statusSaving) return

    setStatusSaving(true)
    setStatusError('')

    try {
      const active = !statusTarget.active

      await productsService.updateStatus(
        statusTarget.id,
        active,
      )

      setSuccess(
        active
          ? 'Produto ativado com sucesso!'
          : 'Produto desativado com sucesso!',
      )

      setStatusTarget(null)
      refresh()
    } catch (error) {
      setStatusError(getApiError(error))
    } finally {
      setStatusSaving(false)
    }
  }

  function clearFilters() {
    setSearch('')
    setDebouncedSearch('')
    setCategoryId('')
    setBrandId('')
    setSaleType('')
    setStatus('all')
    setPage(1)
  }

  const indicators = [
    {
      label: 'Total de produtos',
      value: stats?.total,
      description: 'Produtos cadastrados',
      icon: Package,
      color: 'pink',
    },
    {
      label: 'Produtos ativos',
      value: stats?.active,
      description: 'Disponíveis para operação',
      icon: CheckCircle2,
      color: 'green',
    },
    {
      label: 'Estoque baixo',
      value: stats?.lowStock,
      description: 'Precisam de reposição',
      icon: AlertTriangle,
      color: 'orange',
    },
    {
      label: 'Venda por peso',
      value: stats?.weightProducts,
      description: 'Produtos ativos a granel',
      icon: Scale,
      color: 'blue',
    },
  ]

  return (
    <div className="catalog-page products-page">

      {/* CABECALHO */}

      <header className="catalog-header">

        <div className="catalog-heading">

          <span className="catalog-breadcrumb">
            Cadastros / Produtos
          </span>

          <h1>Produtos</h1>

          <p>
            Gerencie seu catálogo, preços
            e controle de estoque.
          </p>

        </div>

        <div className="catalog-header-actions">

          <button
            type="button"
            className="catalog-button catalog-button-secondary"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw
              size={18}
              className={loading ? 'catalog-spin' : ''}
            />

            Atualizar
          </button>

          {canCreate && (
            <button
              type="button"
              className="catalog-button catalog-button-primary"
              onClick={openCreate}
              disabled={!optionsReady}
            >
              <Plus size={19} />
              Novo produto
            </button>
          )}

        </div>

      </header>

      {/* INDICADORES */}

      <div className="product-stats">

        {indicators.map((item) => {
          const Icon = item.icon

          return (
            <article
              className="product-stat"
              key={item.label}
            >

              <div
                className={`product-stat-icon product-color-${item.color}`}
              >
                <Icon size={24} />
              </div>

              <div>
                <span>{item.label}</span>

                <strong>
                  {item.value ?? '—'}
                </strong>

                <small>{item.description}</small>
              </div>

            </article>
          )
        })}

      </div>

      {/* MENSAGENS */}

      {(listError || metaError) && (
        <div
          className="catalog-alert catalog-alert-error"
          role="alert"
        >
          <AlertCircle size={20} />

          <span>
            {[listError, metaError]
              .filter(Boolean)
              .join(' | ')}
          </span>
        </div>
      )}

      {success && (
        <div
          className="catalog-alert catalog-alert-success"
          role="status"
        >
          <CheckCircle2 size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* LISTAGEM */}

      <section className="catalog-table-card">

        <div className="product-list-heading">

          <div>
            <h2>Produtos cadastrados</h2>
            <p>Consulte e gerencie seus produtos.</p>
          </div>

          <div className="product-shortcuts">

            {hasPermission('categories.view') && (
              <Link to="/categorias">
                <Layers3 size={16} />
                Categorias
              </Link>
            )}

            {hasPermission('brands.view') && (
              <Link to="/marcas">
                <Tag size={16} />
                Marcas
              </Link>
            )}

          </div>

        </div>

        {/* FILTROS */}

        <div className="product-filters">

          <div className="catalog-search product-search">
            <Search size={19} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Nome, código ou código de barras..."
              aria-label="Pesquisar produtos"
            />
          </div>

          <select
            value={categoryId}
            aria-label="Filtrar categoria"
            onChange={(event) => {
              setCategoryId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">
              Todas as categorias
            </option>

            {options.categories.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={brandId}
            aria-label="Filtrar marca"
            onChange={(event) => {
              setBrandId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">
              Todas as marcas
            </option>

            {options.brands.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={saleType}
            aria-label="Filtrar tipo de venda"
            onChange={(event) => {
              setSaleType(
                event.target.value as ProductSaleType | '',
              )
              setPage(1)
            }}
          >
            <option value="">Todos os tipos</option>
            <option value="UNIT">Por unidade</option>
            <option value="WEIGHT">Por quilo</option>
          </select>

          <select
            value={status}
            aria-label="Filtrar situação"
            onChange={(event) => {
              setStatus(
                event.target.value as ProductStatus,
              )
              setPage(1)
            }}
          >
            <option value="all">
              Todas as situações
            </option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>

          <button
            type="button"
            className="catalog-button catalog-button-secondary"
            onClick={clearFilters}
          >
            <X size={16} />
            Limpar
          </button>

        </div>

        {/* ESTADOS DA LISTAGEM */}

        {loading ? (
          <div className="catalog-empty">
            <LoaderCircle
              size={35}
              className="catalog-spin"
            />

            <h3>Carregando produtos...</h3>
          </div>
        ) : listError ? (
          <div className="catalog-empty">
            <AlertCircle size={38} />

            <h3>Não foi possível consultar os produtos</h3>

            <button
              type="button"
              className="catalog-button catalog-button-secondary"
              onClick={refresh}
            >
              Tentar novamente
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="catalog-empty">

            <div className="catalog-empty-icon">
              <Package size={32} />
            </div>

            <h3>Nenhum produto encontrado</h3>

            <p>
              Cadastre um produto ou altere
              os filtros da pesquisa.
            </p>

            {canCreate && (
              <button
                type="button"
                className="catalog-button catalog-button-primary"
                onClick={openCreate}
                disabled={!optionsReady}
              >
                <Plus size={18} />
                Novo produto
              </button>
            )}

          </div>
        ) : (
          <div className="catalog-table-scroll">

            <table className="catalog-table product-table">

              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Comercialização</th>

                  {canViewCost && (
                    <th>Preço de custo</th>
                  )}

                  <th>Preço de venda</th>
                  <th>Estoque</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>

                {products.map((product) => (
                  <tr key={product.id}>

                    <td>
                      <div className="catalog-item">

                        <div className="catalog-item-icon">
                          <Package size={21} />
                        </div>

                        <div className="catalog-item-info">

                          <strong>{product.name}</strong>

                          <span>
                            {product.formattedCode}
                            {' · '}
                            {product.category.name}
                          </span>

                          {product.barcode && (
                            <span>
                              EAN: {product.barcode}
                            </span>
                          )}

                        </div>

                      </div>
                    </td>

                    <td>
                      <span className="product-unit">
                        {product.saleType === 'WEIGHT' ? (
                          <Scale size={16} />
                        ) : (
                          <Package size={16} />
                        )}

                        {product.saleType === 'WEIGHT'
                          ? 'Por kg'
                          : 'Unidade'}
                      </span>
                    </td>

                    {canViewCost && (
                      <td>
                        <span className="product-muted">
                          {product.costPrice !== undefined
                            ? money(product.costPrice)
                            : '—'}
                        </span>
                      </td>
                    )}

                    <td>
                      <strong className="product-price">
                        {money(product.salePrice)}
                      </strong>
                    </td>

                    <td>
                      {product.controlStock ? (
                        <div
                          className={
                            product.outOfStock
                              ? 'product-stock product-stock-danger'
                              : product.lowStock
                                ? 'product-stock product-stock-warning'
                                : 'product-stock product-stock-normal'
                          }
                        >
                          <strong>
                            {stock(
                              product.currentStock,
                              product,
                            )}
                            {' '}
                            {product.unit.toLowerCase()}
                          </strong>

                          <small>
                            {product.outOfStock
                              ? 'Sem estoque'
                              : product.lowStock
                                ? 'Estoque baixo'
                                : 'Disponível'}
                          </small>
                        </div>
                      ) : (
                        <span className="product-muted">
                          Não controlado
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className={
                          product.active
                            ? 'catalog-status catalog-status-active'
                            : 'catalog-status catalog-status-inactive'
                        }
                      >
                        <span />

                        {product.active
                          ? 'Ativo'
                          : 'Inativo'}
                      </span>
                    </td>

                    <td>
                      <div className="catalog-row-actions">

                        {/* FRACIONAMENTO DE PRODUTOS */}

                        <ProductConversionButton
                          product={product}
                        />

                        {canUpdate && (
                          <button
                            type="button"
                            className="catalog-action-edit"
                            aria-label={`Editar ${product.name}`}
                            title="Editar produto"
                            disabled={!optionsReady}
                            onClick={() => openEdit(product)}
                          >
                            <Pencil size={17} />
                          </button>
                        )}

                        {canStatus && (
                          <button
                            type="button"
                            className={
                              product.active
                                ? 'catalog-action-disable'
                                : 'catalog-action-enable'
                            }
                            title={
                              product.active
                                ? 'Desativar'
                                : 'Ativar'
                            }
                            aria-label={
                              `${product.active ? 'Desativar' : 'Ativar'} ${product.name}`
                            }
                            onClick={() => openStatus(product)}
                          >
                            <Power size={17} />
                          </button>
                        )}

                        {!canUpdate && !canStatus && (
                          <span className="product-muted">
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

        {/* PAGINACAO */}

        {!listError && (
          <footer className="product-pagination">

            <span>
              {pagination.total === 0
                ? 'Nenhum produto cadastrado'
                : `Exibindo ${(pagination.page - 1) * PAGE_SIZE + 1}–${Math.min(pagination.page * PAGE_SIZE, pagination.total)} de ${pagination.total} produtos`}
            </span>

            <div>

              <button
                type="button"
                disabled={page <= 1 || loading}
                aria-label="Página anterior"
                onClick={() =>
                  setPage((value) => value - 1)
                }
              >
                <ChevronLeft size={18} />
              </button>

              <strong>
                {page} de {Math.max(1, pagination.totalPages)}
              </strong>

              <button
                type="button"
                disabled={
                  page >= pagination.totalPages ||
                  loading
                }
                aria-label="Próxima página"
                onClick={() =>
                  setPage((value) => value + 1)
                }
              >
                <ChevronRight size={18} />
              </button>

            </div>

          </footer>
        )}

      </section>

      {/* FORMULARIO */}

      {modalOpen && (
        <ProductForm
          product={editingProduct}
          options={options}
          canViewCost={canViewCost}
          canChangePrice={canChangePrice}
          onClose={closeForm}
          onSave={saveProduct}
        />
      )}

      {/* CONFIRMACAO DE STATUS */}

      {statusTarget && (
        <div className="catalog-modal-overlay">

          <section
            className="catalog-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-status-title"
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
                  <AlertTriangle size={26} />
                ) : (
                  <CheckCircle2 size={26} />
                )}
              </div>

              <button
                type="button"
                className="catalog-close"
                disabled={statusSaving}
                onClick={() => setStatusTarget(null)}
                aria-label="Fechar confirmação"
              >
                <X size={22} />
              </button>

            </header>

            <div className="catalog-modal-title">

              <h2 id="product-status-title">
                {statusTarget.active
                  ? 'Desativar produto?'
                  : 'Ativar produto?'}
              </h2>

              <p>
                Deseja realmente{' '}

                {statusTarget.active
                  ? 'desativar'
                  : 'ativar'}

                {' '}

                <strong>{statusTarget.name}</strong>?
              </p>

            </div>

            {statusTarget.active && (
              <div className="catalog-form-note">
                <AlertTriangle size={18} />

                O histórico e o saldo de estoque
                serão preservados.
              </div>
            )}

            {statusError && (
              <div
                className="catalog-alert catalog-alert-error"
                role="alert"
              >
                <AlertCircle size={18} />
                <span>{statusError}</span>
              </div>
            )}

            <footer className="catalog-modal-footer">

              <button
                type="button"
                className="catalog-button catalog-button-secondary"
                disabled={statusSaving}
                onClick={() => setStatusTarget(null)}
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
                disabled={statusSaving}
                onClick={() => void changeStatus()}
              >
                {statusSaving && (
                  <LoaderCircle
                    size={18}
                    className="catalog-spin"
                  />
                )}

                Confirmar
              </button>

            </footer>

          </section>

        </div>
      )}

    </div>
  )
}
