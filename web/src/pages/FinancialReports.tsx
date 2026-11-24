
import { useEffect, useState } from 'react'
import {
  Download,
  Printer,
  RefreshCw,
} from 'lucide-react'

import { getApiError } from '../services/management.service'

import {
  brl,
  localDate,
  paymentLabel,
  rangeForDates,
  reportsService,
} from '../services/reports.service'

import type {
  ReportFilters,
} from '../services/reports.service'

import type {
  FinancialSummary,
} from '../types/reports'

// ============================================
// DATAS
// ============================================

const today = () => localDate(new Date())

const monthAgo = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return localDate(d)
}

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm'

// ============================================
// PAGINA DE RELATORIOS
// ============================================

export default function FinancialReports() {
  const [start, setStart] = useState(monthAgo)
  const [end, setEnd] = useState(today)

  const [terminal, setTerminal] = useState('')
  const [operatorId, setOperatorId] = useState('')

  const [operatorOptions, setOperatorOptions] = useState<
    { id: string; name: string }[]
  >([])

  const [summary, setSummary] =
    useState<FinancialSummary | null>(null)

  const [revision, setRevision] = useState(0)

  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const valid = Boolean(
    start && end && start <= end,
  )

  const filters: ReportFilters = valid
    ? {
        ...rangeForDates(start, end),
        terminal: terminal.trim() || undefined,
        operatorId: operatorId || undefined,
      }
    : {}

  // ============================================
  // CARREGAR RELATORIO
  // ============================================

  useEffect(() => {
    let active = true

    if (!valid) {
      setSummary(null)
      setError('Selecione um período válido.')
      return
    }

    setError('')
    setLoading(true)

    reportsService
      .financialSummary(filters)
      .then((result) => {
        if (!active) return

        setSummary(result)

        if (!operatorId) {
          setOperatorOptions(
            result.operators.map((operator) => ({
              id: operator.id,
              name: operator.name,
            })),
          )
        }
      })
      .catch((err) => {
        if (!active) return

        setSummary(null)
        setError(getApiError(err))
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }

    // Os filtros usam dependencias primitivas
    // para evitar requisicoes repetidas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    start,
    end,
    terminal,
    operatorId,
    revision,
  ])

  // ============================================
  // EXPORTAR CSV
  // ============================================

  async function download(
    kind: 'sales' | 'cash-sessions',
  ) {
    if (!valid) return

    setDownloading(true)
    setError('')

    try {
      const blob = await reportsService.exportCsv(
        kind,
        {
          ...rangeForDates(start, end),
          terminal: terminal.trim() || undefined,

          ...(kind === 'sales'
            ? {
                operatorId: operatorId || undefined,
              }
            : {}),
        },
      )

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url

      link.download =
        `fofuxos-${
          kind === 'sales' ? 'vendas' : 'caixas'
        }-${start}-a-${end}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 1000)
    } catch (err) {
      const response = (
        err as {
          response?: {
            data?: unknown
          }
        }
      )?.response

      if (response?.data instanceof Blob) {
        try {
          const payload = JSON.parse(
            await response.data.text(),
          ) as {
            message?: string | string[]
          }

          setError(
            Array.isArray(payload.message)
              ? payload.message.join('; ')
              : payload.message ||
                  'Erro na exportação.',
          )
        } catch {
          setError(
            'Não foi possível exportar os dados.',
          )
        }
      } else {
        setError(getApiError(err))
      }
    } finally {
      setDownloading(false)
    }
  }

  // ============================================
  // INTERFACE
  // ============================================

  return (
    <div className="space-y-6">
      {/* CABECALHO */}

      <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm font-medium text-[#AD4679]">
            Gestão / Relatórios
          </p>

          <h1 className="text-3xl font-bold">
            Relatórios gerenciais
          </h1>

          <p className="text-sm text-gray-500">
            Informações reais das vendas concluídas
            no PDV.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setRevision((value) => value + 1)
            }
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>

          <button
            type="button"
            disabled={!summary || loading}
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm disabled:opacity-50"
          >
            <Printer size={16} />
            Imprimir / PDF
          </button>
        </div>
      </header>

      {/* FILTROS */}

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <label className="text-xs text-gray-600">
          De

          <input
            type="date"
            className={inputClass}
            value={start}
            onChange={(event) =>
              setStart(event.target.value)
            }
          />
        </label>

        <label className="text-xs text-gray-600">
          Até

          <input
            type="date"
            className={inputClass}
            value={end}
            onChange={(event) =>
              setEnd(event.target.value)
            }
          />
        </label>

        <label className="text-xs text-gray-600">
          Terminal

          <input
            placeholder="Todos os terminais"
            className={inputClass}
            value={terminal}
            onChange={(event) =>
              setTerminal(event.target.value)
            }
          />
        </label>

        <label className="text-xs text-gray-600">
          Operador

          <select
            className={inputClass}
            value={operatorId}
            onChange={(event) =>
              setOperatorId(event.target.value)
            }
          >
            <option value="">
              Todos os operadores
            </option>

            {operatorOptions.map((operator) => (
              <option
                key={operator.id}
                value={operator.id}
              >
                {operator.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* EXPORTACAO */}

      <section className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          disabled={!valid || downloading}
          onClick={() =>
            void download('sales')
          }
          className="flex items-center gap-2 rounded-xl bg-[#AD4679] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Download size={16} />
          Vendas CSV / Excel
        </button>

        <button
          type="button"
          disabled={!valid || downloading}
          onClick={() =>
            void download('cash-sessions')
          }
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <Download size={16} />
          Caixas CSV / Excel
        </button>
      </section>

      {/* MENSAGENS */}

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-700 print:hidden"
        >
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-gray-500 print:hidden">
          Carregando informações...
        </p>
      )}

      {/* RELATORIOS */}

      {summary && !loading && (
        <>
          {/* CABECALHO DE IMPRESSAO */}

          <div className="hidden print:block">
            <h1 className="text-xl font-bold">
              Fofuxos Gestão — Relatório gerencial
            </h1>

            <p>
              Período de{' '}
              {start.split('-').reverse().join('/')}
              {' até '}
              {end.split('-').reverse().join('/')}
              {' · Terminal: '}
              {terminal || 'Todos'}
            </p>
          </div>

          {/* INDICADORES */}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [
                'Vendas concluídas',
                String(summary.salesCount),
              ],
              [
                'Faturamento',
                brl(summary.revenue),
              ],
              [
                'Descontos',
                brl(summary.discounts),
              ],
              [
                'Ticket médio',
                brl(summary.averageTicket),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <p className="text-sm text-gray-500">
                  {label}
                </p>

                <strong className="text-2xl">
                  {value}
                </strong>
              </div>
            ))}
          </section>

          {/* PAGAMENTOS E OPERADORES */}

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-lg font-semibold">
                Formas de pagamento
              </h2>

              <div className="space-y-2">
                {summary.payments.map((row) => (
                  <div
                    key={row.method}
                    className="flex justify-between border-b py-2 text-sm"
                  >
                    <span>
                      {paymentLabel(row.method)}
                      {' ('}
                      {row.count}
                      {')'}
                    </span>

                    <strong>
                      {brl(row.amount)}
                    </strong>
                  </div>
                ))}
              </div>

              {!summary.payments.length && (
                <p className="text-sm text-gray-500">
                  Nenhum pagamento no período.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-lg font-semibold">
                Vendas por operador
              </h2>

              <div className="space-y-2">
                {summary.operators.map((row) => (
                  <div
                    key={row.id}
                    className="flex justify-between border-b py-2 text-sm"
                  >
                    <span>
                      {row.name}
                      {' ('}
                      {row.count}
                      {' vendas)'}
                    </span>

                    <strong>
                      {brl(row.total)}
                    </strong>
                  </div>
                ))}
              </div>

              {!summary.operators.length && (
                <p className="text-sm text-gray-500">
                  Nenhuma venda encontrada.
                </p>
              )}
            </div>
          </section>

          {/* PRODUTOS MAIS VENDIDOS */}

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-lg font-semibold">
              10 produtos com maior faturamento
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-500">
                    <th className="py-2">
                      Produto
                    </th>

                    <th>
                      Quantidade
                    </th>

                    <th className="text-right">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {summary.topProducts.map(
                    (product, index) => (
                      <tr
                        key={`${product.name}-${product.unit}-${index}`}
                        className="border-t"
                      >
                        <td className="py-3">
                          {product.name}
                        </td>

                        <td>
                          {product.quantity}
                          {' '}
                          {product.unit}
                        </td>

                        <td className="text-right font-medium">
                          {brl(product.total)}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {!summary.topProducts.length && (
              <p className="py-3 text-sm text-gray-500">
                Nenhum produto vendido.
              </p>
            )}
          </section>

          {/* OBSERVACOES */}

          <p className="text-sm text-gray-500">
            Base: vendas concluídas. Faturamento não
            equivale a lucro. O CSV de vendas contém
            uma linha por produto e repete os totais
            da venda em cada linha; não some essa
            coluna sem agrupar pelo número da venda.
            O relatório de caixas considera a data
            de abertura; os filtros de operador se
            aplicam apenas às vendas.
          </p>
        </>
      )}
    </div>
  )
}
