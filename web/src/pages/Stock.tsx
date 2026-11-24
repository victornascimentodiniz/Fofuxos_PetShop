import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, ArrowDownCircle, ArrowUpCircle, Boxes, ChevronLeft, ChevronRight, ClipboardList, History, LoaderCircle, Package, PackageOpen, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { getApiError } from '../services/management.service'
import { stockService } from '../services/stock.service'
import type { Fractionation, ProductConversion, StockMovement, StockOperation, StockProduct, StockStats } from '../types/stock'
import '../styles/stock.css'

type Tab = 'balances' | 'movements' | 'fractionations'
const PAGE_SIZE = 20
const EMPTY_PAGE = { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 }
const fmt = (value: string | number, unit?: string) => Number(value).toLocaleString('pt-BR', { minimumFractionDigits: unit === 'UN' ? 0 : 3, maximumFractionDigits: 3 })
const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR')
const normalize = (s: string) => s.trim().replace(',', '.')
const labels: Record<string, string> = {
  ENTRY: 'Entrada', EXIT: 'Saída', ADJUSTMENT: 'Ajuste', FRACTION_OUT: 'Fracionamento (saída)',
  FRACTION_IN: 'Fracionamento (entrada)', SALE: 'Venda', PURCHASE: 'Compra',
}

export default function Stock() {
  const { hasPermission } = usePermissions()
  const canView = hasPermission('stock.view')
  const canHistory = hasPermission('stock.history')
  const canFraction = hasPermission('stock.fraction')
  const [tab, setTab] = useState<Tab>('balances')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [products, setProducts] = useState<StockProduct[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [fractions, setFractions] = useState<Fractionation[]>([])
  const [stats, setStats] = useState<StockStats | null>(null)
  const [pagination, setPagination] = useState(EMPTY_PAGE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [operation, setOperation] = useState<StockOperation | null>(null)
  const [selected, setSelected] = useState<StockProduct | null>(null)
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [observations, setObservations] = useState('')
  const [loss, setLoss] = useState('0')
  const [conversion, setConversion] = useState<ProductConversion | null>(null)
  const [conversionLoading, setConversionLoading] = useState(false)
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(() => setReload(x => x + 1), [])
  useEffect(() => { const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1) }, 350); return () => window.clearTimeout(timer) }, [search])
  useEffect(() => { setPage(1); setError('') }, [tab])
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError('')
      try {
        if (tab === 'balances') {
          if (!canView) return
          const [list, overview] = await Promise.all([stockService.list({ search: query || undefined, page, limit: PAGE_SIZE }), stockService.stats()])
          if (!cancelled) { setProducts(list.data); setPagination(list.pagination); setStats(overview) }
        } else if (tab === 'movements') {
          if (!canHistory) return
          const list = await stockService.movements({ page, limit: PAGE_SIZE })
          if (!cancelled) { setMovements(list.data); setPagination(list.pagination) }
        } else {
          if (!canHistory) return
          const list = await stockService.fractionations({ page, limit: PAGE_SIZE })
          if (!cancelled) { setFractions(list.data); setPagination(list.pagination) }
        }
      } catch (e) { if (!cancelled) setError(getApiError(e)) }
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [tab, page, query, reload, canView, canHistory])

  useEffect(() => {
    if (!operation || !selected || operation !== 'fractionate') { setConversion(null); setConversionLoading(false); return }
    let cancelled = false
    setConversionLoading(true)
    stockService.conversion(selected.id).then(value => { if (!cancelled) setConversion(value) })
      .catch(e => { if (!cancelled) setModalError(getApiError(e)) })
      .finally(() => { if (!cancelled) setConversionLoading(false) })
    return () => { cancelled = true }
  }, [operation, selected])

  function open(item: StockProduct, type: StockOperation) {
    setSelected(item); setOperation(type); setQuantity(''); setReason(''); setObservations(''); setLoss('0'); setModalError(''); setNotice('')
  }
  function close() { if (!saving) { setSelected(null); setOperation(null); setConversion(null) } }
  const numeric = Number(normalize(quantity))
  const lossValue = Number(normalize(loss))
  const validAmount = /^\d{1,11}(\.\d{1,3})?$/.test(normalize(quantity)) && Number.isFinite(numeric) && (operation === 'adjust' ? numeric >= 0 : numeric > 0)
  const validUnit = !selected || selected.unit !== 'UN' || Number.isInteger(numeric)
  const validLoss = /^\d{1,11}(\.\d{1,3})?$/.test(normalize(loss)) && Number.isFinite(lossValue) && lossValue >= 0
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!selected || !operation || saving) return
    setModalError('')
    if (!validAmount || !validUnit) { setModalError('Informe uma quantidade válida para a unidade do produto.'); return }
    if ((operation === 'exit') && numeric > Number(selected.currentStock)) { setModalError('Saldo insuficiente.'); return }
    if (operation === 'fractionate') {
      if (!Number.isSafeInteger(numeric) || numeric < 1) { setModalError('Informe um número inteiro de embalagens.'); return }
      if (!conversion?.active || !conversion.available) { setModalError('Configure uma conversão ativa e disponível para esta embalagem antes de fracionar.'); return }
      if (!validLoss || lossValue >= numeric * Number(conversion.conversionFactor)) { setModalError('A perda deve ser válida e menor que a quantidade gerada.'); return }
      if (numeric > Number(selected.currentStock)) { setModalError('Não há embalagens suficientes em estoque.'); return }
    }
    if (operation !== 'fractionate' && (reason.trim().length < 3 || reason.trim().length > 150)) { setModalError('Informe um motivo entre 3 e 150 caracteres.'); return }
    setSaving(true)
    try {
      if (operation === 'entry') await stockService.entry({ productId: selected.id, quantity: normalize(quantity), reason: reason.trim(), observations: observations.trim() })
      else if (operation === 'exit') await stockService.exit({ productId: selected.id, quantity: normalize(quantity), reason: reason.trim(), observations: observations.trim() })
      else if (operation === 'adjust') await stockService.adjust({ productId: selected.id, newStock: normalize(quantity), reason: reason.trim(), observations: observations.trim() })
      else await stockService.fractionate({ sourceProductId: selected.id, packages: numeric, lossQuantity: normalize(loss), observations: observations.trim() })
      setNotice(({ entry: 'Entrada registrada com sucesso.', exit: 'Saída registrada com sucesso.', adjust: 'Saldo ajustado com sucesso.', fractionate: 'Embalagens fracionadas com sucesso.' })[operation])
      closeAfterSave()
      refresh()
    } catch (e) { setModalError(getApiError(e)) }
    finally { setSaving(false) }
  }
  function closeAfterSave() { setSelected(null); setOperation(null); setConversion(null) }
  const tabs = [ { key: 'balances' as const, text: 'Posição atual', icon: Package, enabled: canView }, { key: 'movements' as const, text: 'Movimentações', icon: History, enabled: canHistory }, { key: 'fractionations' as const, text: 'Fracionamentos', icon: PackageOpen, enabled: canHistory } ]
  if (!canView && !canHistory) return <div className="stock-page"><div className="stock-alert stock-alert-error">Você não tem permissão para consultar o estoque.</div></div>
  return (
    <div className="stock-page">
      <header className="stock-heading"><div><span className="stock-eyebrow">Gerenciamento / Estoque</span><h1>Controle de estoque</h1><p>Gerencie saldos e acompanhe todas as movimentações.</p></div><button type="button" className="stock-btn stock-btn-outline" onClick={refresh}><RefreshCw size={17}/> Atualizar</button></header>
      {canView && <div className="stock-stats">
        {[{ name: 'Produtos controlados', value: stats?.controlled, icon: Boxes }, { name: 'Produtos ativos', value: stats?.active, icon: Package }, { name: 'Sem estoque', value: stats?.withoutStock, icon: AlertCircle }, { name: 'Estoque baixo', value: stats?.lowStock, icon: SlidersHorizontal }].map(item => { const Icon = item.icon; return <article className="stock-stat" key={item.name}><Icon size={23}/><span>{item.name}</span><strong>{item.value ?? '—'}</strong></article> })}
      </div>}
      {notice && <div className="stock-alert stock-alert-success" role="status">{notice}<button type="button" aria-label="Fechar aviso" onClick={() => setNotice('')}><X size={15}/></button></div>}
      {error && <div className="stock-alert stock-alert-error" role="alert"><AlertCircle size={18}/>{error}</div>}
      <nav className="stock-tabs" aria-label="Abas de estoque">{tabs.filter(t => t.enabled).map(t => { const Icon = t.icon; return <button key={t.key} type="button" onClick={() => setTab(t.key)} className={tab === t.key ? 'is-active' : ''}><Icon size={17}/>{t.text}</button> })}</nav>
      {tab === 'balances' && canView && <section className="stock-panel"><div className="stock-panel-top"><div><h2>Posição de estoque</h2><p>Selecione um produto para registrar uma operação.</p></div><div className="stock-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar produtos..." aria-label="Pesquisar produtos"/></div></div>
        <div className="stock-table-wrap"><table><thead><tr><th>Produto</th><th>Saldo</th><th>Mínimo</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
          {!loading && products.map(p => <tr key={p.id}><td><div className="stock-product"><strong>{p.name}</strong><small>{p.formattedCode} · {p.category.name} · {p.unit}</small></div></td><td><strong>{fmt(p.currentStock,p.unit)} {p.unit}</strong></td><td>{fmt(p.minStock,p.unit)}</td><td><span className={'stock-pill ' + (!p.active ? 'muted' : Number(p.currentStock) <= 0 ? 'danger' : p.lowStock ? 'warning' : 'good')}>{!p.active ? 'Inativo' : Number(p.currentStock) <= 0 ? 'Sem estoque' : p.lowStock ? 'Baixo' : 'Normal'}</span></td><td><div className="stock-actions">
            {hasPermission('stock.entry') && <button disabled={!p.active} title="Entrada" onClick={() => open(p,'entry')}><ArrowDownCircle size={18}/></button>}
            {hasPermission('stock.exit') && <button disabled={!p.active} title="Saída" onClick={() => open(p,'exit')}><ArrowUpCircle size={18}/></button>}
            {hasPermission('stock.adjust') && <button disabled={!p.active} title="Ajuste" onClick={() => open(p,'adjust')}><ClipboardList size={18}/></button>}
            {canFraction && p.unit === 'UN' && p.saleType === 'UNIT' && <button disabled={!p.active} title="Abrir embalagem / fracionar" onClick={() => open(p,'fractionate')}><PackageOpen size={18}/></button>}
            </div></td></tr>)}
        </tbody></table>{loading && <div className="stock-empty"><LoaderCircle className="stock-spin" size={25}/> Carregando...</div>}{!loading && products.length === 0 && <div className="stock-empty">Nenhum produto encontrado.</div>}</div>
      </section>}
      {tab === 'movements' && canHistory && <section className="stock-panel"><div className="stock-panel-top"><div><h2>Histórico de movimentações</h2><p>Entradas, saídas, ajustes e fracionamentos realizados.</p></div></div><div className="stock-table-wrap"><table><thead><tr><th>Data</th><th>Produto</th><th>Operação</th><th>Quantidade</th><th>Saldo final</th><th>Responsável</th><th>Motivo</th></tr></thead><tbody>{movements.map(m => <tr key={m.id}><td>{dateTime(m.createdAt)}</td><td>{m.product.name}</td><td>{labels[m.type] ?? m.type}</td><td className={Number(m.quantity) >= 0 ? 'stock-positive' : 'stock-negative'}>{Number(m.quantity)>0?'+':''}{fmt(m.quantity,m.product.unit)} {m.product.unit}</td><td>{fmt(m.newStock,m.product.unit)}</td><td>{m.user.name}</td><td>{m.reason}</td></tr>)}</tbody></table>{loading && <div className="stock-empty"><LoaderCircle className="stock-spin"/> Carregando...</div>}{!loading && movements.length===0 && <div className="stock-empty">Nenhuma movimentação registrada.</div>}</div></section>}
      {tab === 'fractionations' && canHistory && <section className="stock-panel"><div className="stock-panel-top"><div><h2>Histórico de fracionamentos</h2><p>Embalagens abertas e quantidades transferidas.</p></div></div><div className="stock-table-wrap"><table><thead><tr><th>Data</th><th>Origem</th><th>Embalagens</th><th>Destino</th><th>Transferido</th><th>Perdas</th><th>Responsável</th></tr></thead><tbody>{fractions.map(f => <tr key={f.id}><td>{dateTime(f.createdAt)}</td><td>{f.sourceProduct.name}</td><td>{f.packages} UN</td><td>{f.destinationProduct.name}</td><td className="stock-positive">+{fmt(f.netQuantity,f.destinationProduct.unit)} {f.destinationProduct.unit}</td><td>{fmt(f.lossQuantity,f.destinationProduct.unit)}</td><td>{f.user.name}</td></tr>)}</tbody></table>{loading && <div className="stock-empty"><LoaderCircle className="stock-spin"/> Carregando...</div>}{!loading && fractions.length===0 && <div className="stock-empty">Nenhum fracionamento registrado.</div>}</div></section>}
      <footer className="stock-pagination"><span>{pagination.total} registro(s)</span><div><button aria-label="Página anterior" disabled={loading || page<=1} onClick={() => setPage(v=>v-1)}><ChevronLeft size={18}/></button><strong>{page} de {Math.max(1,pagination.totalPages)}</strong><button aria-label="Próxima página" disabled={loading || page>=pagination.totalPages} onClick={() => setPage(v=>v+1)}><ChevronRight size={18}/></button></div></footer>
      {operation && selected && <div className="stock-overlay" role="presentation"><section className="stock-modal" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title"><header><div><span className="stock-eyebrow">{selected.formattedCode} · {selected.unit}</span><h2 id="stock-modal-title">{({entry:'Registrar entrada',exit:'Registrar saída',adjust:'Ajustar saldo',fractionate:'Abrir embalagem'})[operation]}</h2><p>{selected.name}</p></div><button aria-label="Fechar" disabled={saving} onClick={close}><X size={21}/></button></header>
        <form onSubmit={submit}><div className="stock-modal-body"><div className="stock-current">Saldo atual: <strong>{fmt(selected.currentStock,selected.unit)} {selected.unit}</strong></div>
          {operation==='fractionate' && <div className="stock-conversion-info">{conversionLoading ? 'Consultando regra de conversão...' : conversion?.active && conversion.available ? <>Destino: <strong>{conversion.destinationProduct.name}</strong><p>1 embalagem = {fmt(conversion.conversionFactor,conversion.destinationProduct.unit)} {conversion.destinationProduct.unit}</p></> : 'Nenhuma regra de conversão ativa e disponível. Configure o fracionamento primeiro no cadastro do produto.'}</div>}
          <label>{operation==='adjust'?'Novo saldo':operation==='fractionate'?'Quantidade de embalagens':'Quantidade movimentada'} <input value={quantity} onChange={e=>setQuantity(e.target.value)} placeholder={operation==='fractionate'?'Ex.: 1':'Ex.: 5'} inputMode={selected.unit==='UN'?'numeric':'decimal'} required disabled={saving}/></label>
          {operation==='fractionate' ? <label>Perda durante a abertura ({conversion?.destinationProduct.unit ?? 'unidade'}) <input value={loss} onChange={e=>setLoss(e.target.value)} inputMode="decimal" disabled={saving}/></label> : <label>Motivo da operação <input value={reason} maxLength={150} onChange={e=>setReason(e.target.value)} placeholder="Ex.: Reposição de mercadorias" required disabled={saving}/></label>}
          <label>Observações (opcional) <textarea rows={3} maxLength={2000} value={observations} onChange={e=>setObservations(e.target.value)} disabled={saving}/></label>
          {operation==='fractionate' && conversion?.available && validAmount && validLoss && <div className="stock-preview">Previsão de entrada: <strong>{fmt(numeric*Number(conversion.conversionFactor)-lossValue,conversion.destinationProduct.unit)} {conversion.destinationProduct.unit}</strong></div>}
          {modalError && <div className="stock-alert stock-alert-error" role="alert">{modalError}</div>}
        </div><footer><button type="button" className="stock-btn stock-btn-outline" onClick={close} disabled={saving}>Cancelar</button><button type="submit" className="stock-btn stock-btn-primary" disabled={saving || conversionLoading || (operation==='fractionate' && (!conversion?.active || !conversion.available))}>{saving && <LoaderCircle size={16} className="stock-spin"/>} Confirmar operação</button></footer></form></section></div>}
    </div>
  )
}
