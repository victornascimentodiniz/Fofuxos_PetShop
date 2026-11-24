
import {
  useEffect,
  useState,
} from 'react'

import type { FormEvent } from 'react'

import { createPortal } from 'react-dom'

import {
  Package,
  PackageOpen,
  Scale,
  Boxes,
  ArrowRight,
  Search,
  X,
  Check,
  Info,
  Power,
  AlertCircle,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'

import type { Product } from '../../types/product'

import type {
  ProductConversion,
  ConversionProduct,
} from '../../types/product-conversion'

import {
  productConversionsService,
} from '../../services/product-conversions.service'

import {
  getApiError,
} from '../../services/management.service'

import '../../styles/product-conversions.css'

interface ProductConversionModalProps {
  product: Product
  onClose: () => void
  onSaved?: () => void
}

function decimal(value: string) {
  return value.trim().replace(',', '.')
}

function formatQuantity(value: string | number) {
  return Number(value).toLocaleString('pt-BR', {
    maximumFractionDigits: 3,
  })
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function ProductConversionModal({
  product,
  onClose,
  onSaved,
}: ProductConversionModalProps) {
  const [conversion, setConversion] =
    useState<ProductConversion | null>(null)

  const [options, setOptions] =
    useState<ConversionProduct[]>([])

  const [destination, setDestination] =
    useState<ConversionProduct | null>(null)

  const [factor, setFactor] = useState('')

  const [description, setDescription] =
    useState('')

  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)

  const [searching, setSearching] =
    useState(false)

  const [saving, setSaving] = useState(false)

  const [ready, setReady] = useState(false)

  const [error, setError] = useState('')

  const [searchError, setSearchError] =
    useState('')

  const [success, setSuccess] = useState('')

  const [reload, setReload] = useState(0)

  const eligible =
    product.active &&
    product.controlStock &&
    product.unit === 'UN' &&
    product.saleType === 'UNIT'

  const numericFactor = Number(decimal(factor))

  const validFactor =
    /^\d{1,11}(\.\d{1,3})?$/.test(decimal(factor)) &&
    numericFactor > 0 &&
    (
      destination?.unit !== 'UN' ||
      Number.isInteger(numericFactor)
    )

  const convertedCost =
    product.costPrice !== undefined &&
    validFactor
      ? Number(product.costPrice) / numericFactor
      : null

  // ==========================================
  // CARREGAR CONFIGURACAO EXISTENTE
  // ==========================================

  useEffect(() => {
    let cancelled = false

    async function loadConversion() {
      setLoading(true)
      setReady(false)
      setError('')

      try {
        const result =
          await productConversionsService.findBySource(
            product.id,
          )

        if (cancelled) return

        setConversion(result)

        setDestination(
          result?.destinationProduct ?? null,
        )

        setFactor(
          result?.conversionFactor ?? '',
        )

        setDescription(
          result?.description ?? '',
        )

        setReady(true)
      } catch (error) {
        if (!cancelled) {
          setError(getApiError(error))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadConversion()

    return () => {
      cancelled = true
    }
  }, [product.id, reload])

  // ==========================================
  // PESQUISAR PRODUTOS PARA VINCULACAO
  // ==========================================

  useEffect(() => {
    if (!ready || !eligible) return

    let cancelled = false

    setSearching(true)
    setSearchError('')

    const timer = window.setTimeout(
      async () => {
        try {
          const result =
            await productConversionsService.findOptions(
              product.id,
              search.trim(),
            )

          if (!cancelled) {
            setOptions(result)
          }
        } catch (error) {
          if (!cancelled) {
            setOptions([])
            setSearchError(getApiError(error))
          }
        } finally {
          if (!cancelled) {
            setSearching(false)
          }
        }
      },
      300,
    )

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [product.id, ready, eligible, search])

  // ==========================================
  // BLOQUEAR ROLAGEM DA PAGINA
  // ==========================================

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [])

  // ==========================================
  // FECHAR COM ESC
  // ==========================================

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === 'Escape' &&
        !saving
      ) {
        onClose()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [saving, onClose])

  // ==========================================
  // SELECIONAR DESTINO
  // ==========================================

  function selectDestination(
    item: ConversionProduct,
  ) {
    setDestination(item)
    setSearch('')
    setError('')
    setSuccess('')
  }

  // ==========================================
  // SALVAR CONFIGURACAO
  // ==========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      saving ||
      !eligible ||
      !ready
    ) {
      return
    }

    setError('')
    setSuccess('')

    if (!destination) {
      setError(
        'Selecione o produto de destino.',
      )
      return
    }

    if (
      !destination.active ||
      !destination.controlStock
    ) {
      setError(
        'O produto de destino deve estar ativo e controlar estoque.',
      )
      return
    }

    if (destination.id === product.id) {
      setError(
        'O destino não pode ser o próprio produto.',
      )
      return
    }

    if (!validFactor) {
      setError(
        destination.unit === 'UN'
          ? 'Informe uma quantidade inteira maior que zero.'
          : 'Informe uma quantidade maior que zero, com até três casas decimais.',
      )

      return
    }

    setSaving(true)

    try {
      const result =
        await productConversionsService.save(
          product.id,
          {
            destinationProductId:
              destination.id,

            conversionFactor:
              decimal(factor),

            description:
              description.trim() || null,
          },
        )

      setConversion(result)

      setDestination(
        result.destinationProduct,
      )

      setFactor(result.conversionFactor)

      setDescription(
        result.description ?? '',
      )

      setSuccess(
        'Configuração de fracionamento salva com sucesso!',
      )

      onSaved?.()
    } catch (error) {
      setError(getApiError(error))
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // ATIVAR OU DESATIVAR CONVERSAO
  // ==========================================

  async function handleStatus() {
    if (!conversion || saving) return

    const nextStatus = !conversion.active

    const confirmed = window.confirm(
      nextStatus
        ? 'Deseja reativar esta conversão?'
        : 'Deseja desativar esta conversão? Os estoques não serão alterados.',
    )

    if (!confirmed) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const result =
        await productConversionsService.updateStatus(
          product.id,
          nextStatus,
        )

      setConversion(result)

      setDestination(
        result.destinationProduct,
      )

      setFactor(result.conversionFactor)

      setDescription(
        result.description ?? '',
      )

      setSuccess(
        nextStatus
          ? 'Conversão reativada com sucesso!'
          : 'Conversão desativada com sucesso!',
      )

      onSaved?.()
    } catch (error) {
      setError(getApiError(error))
    } finally {
      setSaving(false)
    }
  }

  const DestinationIcon =
    destination?.unit === 'UN'
      ? Boxes
      : Scale

  // ==========================================
  // INTERFACE
  // ==========================================

  return createPortal(
    <div className="conversion-overlay">

      <section
        className="conversion-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversion-title"
      >

        <header className="conversion-header">

          <div className="conversion-header-icon">
            <PackageOpen size={28} />
          </div>

          <div className="conversion-heading">
            <h2 id="conversion-title">
              Configurar fracionamento
            </h2>

            <p>
              Vincule embalagens aos produtos
              fracionados.
            </p>
          </div>

          <button
            type="button"
            className="conversion-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
          >
            <X size={23} />
          </button>

        </header>

        <form onSubmit={handleSubmit}>

          <div className="conversion-body">

            {error && (
              <div
                className="conversion-message conversion-error"
                role="alert"
              >
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                className="conversion-message conversion-success"
                role="status"
              >
                <Check size={20} />
                <span>{success}</span>
              </div>
            )}

            {loading ? (
              <div className="conversion-loading">

                <LoaderCircle
                  size={32}
                  className="conversion-spin"
                />

                <p>Carregando configuração...</p>

              </div>
            ) : !ready ? (
              <div className="conversion-loading">

                <p>
                  Não foi possível consultar
                  a configuração.
                </p>

                <button
                  type="button"
                  className="conversion-button conversion-secondary"
                  onClick={() =>
                    setReload((value) => value + 1)
                  }
                >
                  <RefreshCw size={17} />
                  Tentar novamente
                </button>

              </div>
            ) : (
              <>

                {/* PRODUTO DE ORIGEM */}

                <section className="conversion-section">

                  <h3>Produto de origem</h3>

                  <div className="conversion-source">

                    <div className="conversion-product-icon">
                      <Package size={25} />
                    </div>

                    <div className="conversion-product-info">

                      <strong>{product.name}</strong>

                      <span>
                        Código {product.formattedCode}
                        {' · '}
                        {product.unit}
                      </span>

                      <small>
                        Estoque atual:{' '}
                        {formatQuantity(
                          product.currentStock,
                        )}
                        {' '}
                        {product.unit}
                      </small>

                    </div>

                    {conversion && (
                      <span
                        className={
                          conversion.active
                            ? 'conversion-badge conversion-active'
                            : 'conversion-badge conversion-inactive'
                        }
                      >
                        {conversion.active
                          ? 'Habilitada'
                          : 'Desabilitada'}
                      </span>
                    )}

                  </div>

                </section>

                {!eligible && (
                  <div className="conversion-message conversion-warning">

                    <Info size={19} />

                    Este produto precisa estar ativo,
                    controlar estoque e ser vendido
                    por unidade para configurar
                    o fracionamento.

                  </div>
                )}

                {conversion?.active &&
                  !conversion.available && (
                    <div className="conversion-message conversion-warning">

                      <AlertCircle size={19} />

                      A conversão está habilitada,
                      mas os produtos vinculados
                      não estão disponíveis para
                      fracionamento.

                    </div>
                  )}

                {/* PRODUTO DE DESTINO */}

                <section className="conversion-section">

                  <h3>Produto de destino *</h3>

                  <p>
                    Selecione o produto que receberá
                    a mercadoria da embalagem aberta.
                  </p>

                  {destination && (
                    <div className="conversion-destination">

                      <div className="conversion-destination-icon">
                        <DestinationIcon size={24} />
                      </div>

                      <div className="conversion-product-info">

                        <strong>
                          {destination.name}
                        </strong>

                        <span>
                          Código {destination.formattedCode}
                          {' · '}
                          {destination.unit}
                        </span>

                        <small>
                          Estoque atual:{' '}
                          {formatQuantity(
                            destination.currentStock,
                          )}
                          {' '}
                          {destination.unit}
                        </small>

                      </div>

                      <button
                        type="button"
                        className="conversion-close"
                        disabled={saving || !eligible}
                        onClick={() => {
                          setDestination(null)
                          setSuccess('')
                          setError('')
                        }}
                        aria-label="Remover seleção"
                      >
                        <X size={19} />
                      </button>

                    </div>
                  )}

                  {eligible && (
                    <>

                      <div className="conversion-search">

                        <Search size={19} />

                        <input
                          value={search}
                          disabled={saving}
                          onChange={(event) =>
                            setSearch(event.target.value)
                          }
                          placeholder="Pesquisar nome, código ou código de barras..."
                          aria-label="Pesquisar produto de destino"
                          maxLength={150}
                        />

                        {searching && (
                          <LoaderCircle
                            size={18}
                            className="conversion-spin"
                          />
                        )}

                      </div>

                      {searchError && (
                        <div className="conversion-message conversion-error">
                          <AlertCircle size={17} />
                          {searchError}
                        </div>
                      )}

                      {(!destination || search.trim()) && (
                        <div className="conversion-options">

                          {searching ? (
                            <div className="conversion-empty">
                              Pesquisando produtos...
                            </div>
                          ) : options.length === 0 ? (
                            <div className="conversion-empty">
                              Nenhum produto disponível.

                              <small>
                                Cadastre o produto de
                                destino antes de vincular.
                              </small>
                            </div>
                          ) : (
                            options.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className={
                                  destination?.id === item.id
                                    ? 'conversion-option selected'
                                    : 'conversion-option'
                                }
                                disabled={saving}
                                onClick={() =>
                                  selectDestination(item)
                                }
                              >

                                <div className="conversion-option-icon">
                                  {item.unit === 'KG' ? (
                                    <Scale size={20} />
                                  ) : (
                                    <Boxes size={20} />
                                  )}
                                </div>

                                <div className="conversion-product-info">

                                  <strong>
                                    {item.name}
                                  </strong>

                                  <span>
                                    {item.formattedCode}
                                    {' · '}
                                    {item.category.name}
                                  </span>

                                </div>

                                <span className="conversion-unit">
                                  {item.unit}
                                </span>

                                {destination?.id === item.id && (
                                  <Check size={18} />
                                )}

                              </button>
                            ))
                          )}

                        </div>
                      )}

                    </>
                  )}

                </section>

                {/* FATOR DE CONVERSAO */}

                <section className="conversion-section">

                  <h3>Regra de conversão</h3>

                  <label className="conversion-field">

                    Quantidade gerada por embalagem
                    {destination
                      ? ` (${destination.unit})`
                      : ''}
                    {' *'}

                    <input
                      value={factor}
                      inputMode="decimal"
                      placeholder="Ex.: 15"
                      disabled={saving || !eligible}
                      onChange={(event) => {
                        setFactor(event.target.value)
                        setSuccess('')
                      }}
                      required
                    />

                  </label>

                  <div className="conversion-preview">

                    <div>

                      <Package size={34} />

                      <strong>1 UN</strong>

                      <span>Embalagem fechada</span>

                    </div>

                    <ArrowRight
                      size={28}
                      className="conversion-arrow"
                    />

                    <div>

                      <DestinationIcon size={34} />

                      <strong>
                        {validFactor
                          ? formatQuantity(numericFactor)
                          : '—'}
                        {' '}
                        {destination?.unit ?? ''}
                      </strong>

                      <span>Produto fracionado</span>

                    </div>

                  </div>

                  {convertedCost !== null &&
                    destination && (
                      <div className="conversion-cost">

                        <span>
                          Custo convertido estimado
                          por {destination.unit}
                        </span>

                        <strong>
                          {formatMoney(convertedCost)}
                        </strong>

                        <small>
                          Referência baseada no custo
                          cadastrado da embalagem.
                        </small>

                      </div>
                    )}

                  <label className="conversion-field">

                    Observações

                    <textarea
                      value={description}
                      onChange={(event) => {
                        setDescription(event.target.value)
                        setSuccess('')
                      }}
                      placeholder="Informações adicionais sobre a conversão..."
                      maxLength={2000}
                      rows={3}
                      disabled={saving || !eligible}
                    />

                  </label>

                </section>

                {/* AVISO DE ESTOQUE */}

                <div className="conversion-message conversion-info">

                  <Info size={21} />

                  <div>

                    <strong>
                      Configuração de fracionamento
                    </strong>

                    <p>
                      Salvar esta regra não altera
                      o estoque ou o custo dos produtos.
                      A abertura das embalagens será
                      realizada pelo módulo de estoque.
                    </p>

                  </div>

                </div>

                {/* SITUACAO DA CONVERSAO */}

                {conversion && (
                  <section className="conversion-status-area">

                    <div>

                      <strong>
                        Situação da conversão
                      </strong>

                      <p>
                        {conversion.active
                          ? 'Esta configuração está habilitada.'
                          : 'Esta configuração está desabilitada.'}
                      </p>

                    </div>

                    <button
                      type="button"
                      className={
                        conversion.active
                          ? 'conversion-button conversion-danger'
                          : 'conversion-button conversion-enable'
                      }
                      onClick={() => void handleStatus()}
                      disabled={
                        saving ||
                        (!conversion.active && !eligible)
                      }
                    >

                      <Power size={17} />

                      {conversion.active
                        ? 'Desativar'
                        : 'Reativar'}

                    </button>

                  </section>
                )}

              </>
            )}

          </div>

          {/* RODAPE */}

          <footer className="conversion-footer">

            <span>* Campos obrigatórios</span>

            <div>

              <button
                type="button"
                className="conversion-button conversion-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Fechar
              </button>

              <button
                type="submit"
                className="conversion-button conversion-primary"
                disabled={
                  saving ||
                  loading ||
                  !ready ||
                  !eligible ||
                  !destination ||
                  !validFactor
                }
              >

                {saving ? (
                  <LoaderCircle
                    size={18}
                    className="conversion-spin"
                  />
                ) : (
                  <Check size={18} />
                )}

                {saving
                  ? 'Salvando...'
                  : 'Salvar configuração'}

              </button>

            </div>

          </footer>

        </form>

      </section>

    </div>,

    document.body,
  )
}
