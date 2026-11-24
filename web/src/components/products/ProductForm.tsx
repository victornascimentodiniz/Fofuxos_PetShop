
import { useState } from 'react'
import type { FormEvent } from 'react'

import {
  Package,
  Barcode,
  ShoppingCart,
  Warehouse,
  ClipboardList,
  X,
  Check,
  Info,
  AlertCircle,
  LoaderCircle,
  Scale,
  Boxes,
} from 'lucide-react'

import type {
  Product,
  ProductInput,
  ProductOptions,
  ProductSaleType,
} from '../../types/product'

import {
  getApiError,
} from '../../services/management.service'

interface ProductFormProps {
  product?: Product | null
  options: ProductOptions

  canViewCost: boolean
  canChangePrice: boolean

  onClose: () => void

  onSave: (data: ProductInput) => Promise<void>
}

function decimal(value: string) {
  return value.trim().replace(',', '.')
}

function money(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function ProductForm({
  product,
  options,
  canViewCost,
  canChangePrice,
  onClose,
  onSave,
}: ProductFormProps) {
  const editing = Boolean(product)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: product?.name ?? '',
    barcode: product?.barcode ?? '',
    description: product?.description ?? '',

    categoryId: product?.categoryId ?? '',
    brandId: product?.brandId ?? '',

    saleType: product?.saleType ?? 'UNIT',

    costPrice: product?.costPrice ?? '0',
    salePrice: product?.salePrice ?? '',

    controlStock: product?.controlStock ?? true,

    minStock: product?.minStock ?? '0',
    maxStock: product?.maxStock ?? '',

    location: product?.location ?? '',
    observations: product?.observations ?? '',
  })

  function update<K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const cost =
    Number(decimal(form.costPrice)) || 0

  const price =
    Number(decimal(form.salePrice)) || 0

  const grossProfit = price - cost

  const margin =
    price > 0
      ? (grossProfit / price) * 100
      : 0

  const markup =
    cost > 0
      ? (grossProfit / cost) * 100
      : 0

  const weight = form.saleType === 'WEIGHT'

  // Preserva categoria ou marca inativa
  // durante a edição de produtos inativos.

  const categories = [
    ...options.categories,
  ]

  if (
    product &&
    !categories.some(
      (item) => item.id === product.categoryId,
    )
  ) {
    categories.push({
      id: product.category.id,
      name: `${product.category.name} (inativa)`,
    })
  }

  const brands = [...options.brands]

  if (
    product?.brand &&
    !brands.some(
      (item) => item.id === product.brandId,
    )
  ) {
    brands.push({
      id: product.brand.id,
      name: `${product.brand.name} (inativa)`,
    })
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (saving) return

    setError('')

    if (form.name.trim().length < 2) {
      setError('Informe o nome do produto.')
      return
    }

    if (!form.categoryId) {
      setError('Selecione uma categoria.')
      return
    }

    const salePrice = decimal(form.salePrice)
    const costPrice = decimal(form.costPrice)

    const minStock =
      decimal(form.minStock || '0')

    const maxStock =
      decimal(form.maxStock) || null

    if (
      (!editing || canChangePrice) &&
      (
        !/^\d{1,12}(\.\d{1,2})?$/.test(salePrice) ||
        Number(salePrice) <= 0
      )
    ) {
      setError(
        'Informe um preço de venda válido e maior que zero.',
      )
      return
    }

    if (
      canViewCost &&
      !/^\d{1,10}(\.\d{1,4})?$/.test(costPrice)
    ) {
      setError('Informe um preço de custo válido.')
      return
    }

    const stockPattern = weight
      ? /^\d{1,11}(\.\d{1,3})?$/
      : /^\d{1,11}(\.0{1,3})?$/

    if (
      !stockPattern.test(minStock) ||
      (
        maxStock !== null &&
        !stockPattern.test(maxStock)
      )
    ) {
      setError(
        weight
          ? 'Informe quantidades válidas com até três casas decimais.'
          : 'Produtos vendidos por unidade exigem quantidades inteiras.',
      )

      return
    }

    if (
      maxStock !== null &&
      Number(maxStock) < Number(minStock)
    ) {
      setError(
        'O estoque máximo não pode ser menor que o mínimo.',
      )
      return
    }

    const payload: ProductInput = {
      name: form.name.trim(),

      barcode: form.barcode.trim() || null,

      description:
        form.description.trim() || null,

      categoryId: form.categoryId,

      brandId: form.brandId || null,

      controlStock: form.controlStock,

      minStock,

      maxStock,

      location: form.location.trim() || null,

      observations:
        form.observations.trim() || null,
    }

    // Não tentar alterar a unidade de um
    // produto que já está cadastrado.

    if (!editing) {
      payload.saleType = form.saleType

      payload.unit = weight ? 'KG' : 'UN'
    }

    if (canViewCost) {
      payload.costPrice = costPrice
    }

    if (canChangePrice) {
      payload.salePrice = salePrice
    }

    setSaving(true)

    try {
      await onSave(payload)
    } catch (error) {
      setError(getApiError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="product-modal-overlay">

      <section
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
      >

        {/* CABECALHO */}

        <header className="product-modal-header">

          <div className="product-modal-icon">
            <Package size={27} />
          </div>

          <div className="product-modal-heading">

            <h2 id="product-form-title">
              {editing
                ? 'Editar produto'
                : 'Novo produto'}
            </h2>

            <p>
              {editing
                ? `Código ${product?.formattedCode}`
                : 'Preencha as informações do produto.'}
            </p>

          </div>

          <button
            type="button"
            className="product-icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar formulário"
          >
            <X size={23} />
          </button>

        </header>

        <form onSubmit={handleSubmit}>

          <div className="product-modal-body">

            {error && (
              <div
                className="catalog-alert catalog-alert-error"
                role="alert"
              >
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <fieldset disabled={saving}>

              {/* IDENTIFICACAO */}

              <section className="product-form-section">

                <div className="product-section-title">
                  <Barcode size={21} />

                  <div>
                    <h3>Identificação</h3>
                    <p>
                      Informações principais do produto.
                    </p>
                  </div>
                </div>

                <div className="product-form-grid">

                  <label className="product-field">
                    Código interno

                    <input
                      value={
                        product?.formattedCode ??
                        'Gerado automaticamente'
                      }
                      readOnly
                      disabled
                    />
                  </label>

                  <label className="product-field">
                    Código de barras

                    <input
                      value={form.barcode}
                      onChange={(event) =>
                        update(
                          'barcode',
                          event.target.value,
                        )
                      }
                      placeholder="Digite ou utilize o leitor"
                      maxLength={50}
                    />
                  </label>

                  <label className="product-field product-field-full">
                    Nome do produto *

                    <input
                      value={form.name}
                      onChange={(event) =>
                        update(
                          'name',
                          event.target.value,
                        )
                      }
                      placeholder="Ex.: Ração Golden Adultos"
                      maxLength={150}
                      minLength={2}
                      autoFocus
                      required
                    />
                  </label>

                  <label className="product-field">
                    Categoria *

                    <select
                      value={form.categoryId}
                      onChange={(event) =>
                        update(
                          'categoryId',
                          event.target.value,
                        )
                      }
                      required
                    >
                      <option value="">
                        Selecione uma categoria
                      </option>

                      {categories.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="product-field">
                    Marca

                    <select
                      value={form.brandId}
                      onChange={(event) =>
                        update(
                          'brandId',
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        Sem marca
                      </option>

                      {brands.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="product-field product-field-full">
                    Descrição complementar

                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        update(
                          'description',
                          event.target.value,
                        )
                      }
                      placeholder="Informações adicionais do produto"
                      maxLength={2000}
                      rows={3}
                    />
                  </label>

                </div>

              </section>

              {/* COMERCIALIZACAO */}

              <section className="product-form-section">

                <div className="product-section-title">
                  <ShoppingCart size={21} />

                  <div>
                    <h3>Comercialização</h3>
                    <p>Defina preços e forma de venda.</p>
                  </div>
                </div>

                <div className="product-sale-options">

                  {([
                    {
                      value: 'UNIT',
                      title: 'Por unidade',
                      description: 'Produtos inteiros',
                      icon: Boxes,
                    },
                    {
                      value: 'WEIGHT',
                      title: 'Por quilo',
                      description: 'Produtos fracionados',
                      icon: Scale,
                    },
                  ] as const).map((option) => {
                    const Icon = option.icon

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={editing || saving}
                        className={
                          form.saleType === option.value
                            ? 'product-sale-option selected'
                            : 'product-sale-option'
                        }
                        aria-pressed={
                          form.saleType === option.value
                        }
                        onClick={() =>
                          update(
                            'saleType',
                            option.value as ProductSaleType,
                          )
                        }
                      >
                        <Icon size={25} />

                        <div>
                          <strong>{option.title}</strong>
                          <small>{option.description}</small>
                        </div>

                        {form.saleType === option.value && (
                          <Check size={18} />
                        )}
                      </button>
                    )
                  })}

                </div>

                {editing && (
                  <div className="product-help">
                    <Info size={16} />
                    O tipo de venda não pode ser alterado
                    depois do cadastro.
                  </div>
                )}

                <div className="product-form-grid">

                  {canViewCost && (
                    <label className="product-field">
                      Preço de custo {weight ? 'por kg' : ''}

                      <div className="product-money-input">
                        <span>R$</span>

                        <input
                          value={form.costPrice}
                          onChange={(event) =>
                            update(
                              'costPrice',
                              event.target.value,
                            )
                          }
                          inputMode="decimal"
                          placeholder="0,00"
                        />
                      </div>
                    </label>
                  )}

                  <label className="product-field">
                    Preço de venda {weight ? 'por kg' : ''} *

                    <div className="product-money-input">
                      <span>R$</span>

                      <input
                        value={form.salePrice}
                        onChange={(event) =>
                          update(
                            'salePrice',
                            event.target.value,
                          )
                        }
                        inputMode="decimal"
                        placeholder="0,00"
                        required={!editing || canChangePrice}
                        disabled={!canChangePrice}
                      />
                    </div>
                  </label>

                </div>

                {canViewCost && (
                  <div className="product-profit-grid">

                    <div className="product-profit-card">
                      <span>Lucro bruto</span>
                      <strong
                        className={
                          grossProfit < 0
                            ? 'product-negative'
                            : ''
                        }
                      >
                        {money(grossProfit)}
                      </strong>
                    </div>

                    <div className="product-profit-card">
                      <span>Margem bruta</span>
                      <strong>
                        {price > 0
                          ? `${margin.toFixed(2).replace('.', ',')}%`
                          : '—'}
                      </strong>
                    </div>

                    <div className="product-profit-card">
                      <span>Markup</span>
                      <strong>
                        {cost > 0
                          ? `${markup.toFixed(2).replace('.', ',')}%`
                          : '—'}
                      </strong>
                    </div>

                  </div>
                )}

                {canViewCost && price > 0 && (
                  <div className="product-help">
                    <Info size={16} />

                    Valores estimados, sem descontar
                    taxas, impostos e despesas.
                  </div>
                )}

              </section>

              {/* ESTOQUE */}

              <section className="product-form-section">

                <div className="product-section-title">
                  <Warehouse size={21} />

                  <div>
                    <h3>Controle de estoque</h3>
                    <p>Configure os limites de reposição.</p>
                  </div>
                </div>

                <label className="product-checkbox">

                  <input
                    type="checkbox"
                    checked={form.controlStock}
                    onChange={(event) =>
                      update(
                        'controlStock',
                        event.target.checked,
                      )
                    }
                    disabled={
                      editing &&
                      Number(product?.currentStock ?? 0) !== 0
                    }
                  />

                  <div>
                    <strong>Controlar estoque</strong>
                    <span>
                      Registrar entradas e saídas deste produto.
                    </span>
                  </div>

                </label>

                {form.controlStock && (
                  <div className="product-form-grid">

                    <label className="product-field">
                      Estoque atual

                      <input
                        value={
                          product?.currentStock ?? '0.000'
                        }
                        disabled
                        readOnly
                      />
                    </label>

                    <label className="product-field">
                      Unidade de estoque

                      <input
                        value={weight ? 'Quilograma (KG)' : 'Unidade (UN)'}
                        disabled
                        readOnly
                      />
                    </label>

                    <label className="product-field">
                      Estoque mínimo

                      <input
                        value={form.minStock}
                        inputMode="decimal"
                        onChange={(event) =>
                          update(
                            'minStock',
                            event.target.value,
                          )
                        }
                        placeholder="0"
                      />
                    </label>

                    <label className="product-field">
                      Estoque máximo

                      <input
                        value={form.maxStock}
                        inputMode="decimal"
                        onChange={(event) =>
                          update(
                            'maxStock',
                            event.target.value,
                          )
                        }
                        placeholder="Sem limite definido"
                      />
                    </label>

                  </div>
                )}

                <div className="product-help">
                  <Info size={16} />
                  O saldo atual será atualizado
                  através das movimentações de estoque.
                </div>

              </section>

              {/* INFORMACOES ADICIONAIS */}

              <section className="product-form-section">

                <div className="product-section-title">
                  <ClipboardList size={21} />

                  <div>
                    <h3>Informações complementares</h3>
                    <p>Organização e observações internas.</p>
                  </div>
                </div>

                <div className="product-form-grid">

                  <label className="product-field product-field-full">
                    Localização na loja

                    <input
                      value={form.location}
                      onChange={(event) =>
                        update(
                          'location',
                          event.target.value,
                        )
                      }
                      placeholder="Ex.: Prateleira 03"
                      maxLength={100}
                    />
                  </label>

                  <label className="product-field product-field-full">
                    Observações

                    <textarea
                      value={form.observations}
                      onChange={(event) =>
                        update(
                          'observations',
                          event.target.value,
                        )
                      }
                      placeholder="Observações internas..."
                      maxLength={2000}
                      rows={3}
                    />
                  </label>

                </div>

              </section>

            </fieldset>

          </div>

          {/* RODAPE */}

          <footer className="product-modal-footer">

            <span>* Campos obrigatórios</span>

            <div>

              <button
                type="button"
                className="catalog-button catalog-button-secondary"
                disabled={saving}
                onClick={onClose}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="catalog-button catalog-button-primary"
                disabled={
                  saving ||
                  (!editing && !canChangePrice)
                }
              >
                {saving ? (
                  <LoaderCircle
                    size={19}
                    className="catalog-spin"
                  />
                ) : (
                  <Check size={19} />
                )}

                {saving
                  ? 'Salvando...'
                  : 'Salvar produto'}

              </button>

            </div>

          </footer>

        </form>

      </section>

    </div>
  )
}
