import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Wallet } from 'lucide-react'
import { getApiError } from '../services/management.service'
import { brl, localDate, movementLabel, paymentLabel, rangeForDates, reportsService, when } from '../services/reports.service'
import type { CashDetail, CashSessionRow, Pagination } from '../types/reports'

const today = () => localDate(new Date())
const monthAgo = () => { const d = new Date(); d.setDate(d.getDate() - 30); return localDate(d) }
export default function CashManagement() {
  const [start, setStart] = useState(monthAgo)
  const [end, setEnd] = useState(today)
  const [terminal, setTerminal] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [rows, setRows] = useState<CashSessionRow[]>([])
  const [pagination, setPagination] = useState<Pagination>({page:1,limit:20,total:0,totalPages:0})
  const [detail, setDetail] = useState<CashDetail|null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setPage(1) }, [start,end,terminal,status])
  useEffect(() => {
    let active = true
    if (start > end) { setError('Intervalo de datas inválido.'); return }
    setLoading(true); setError('')
    reportsService.sessions({...rangeForDates(start,end), terminal:terminal.trim()||undefined,status:status||undefined,page})
      .then(r=>{if(active){setRows(r.data);setPagination(r.pagination)}})
      .catch(e=>{if(active){setRows([]);setError(getApiError(e))}})
      .finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[start,end,terminal,status,page,revision])
  async function openDetail(id:string) {
    setError('');setDetailLoading(true)
    try { setDetail(await reportsService.session(id)) } catch(e) { setError(getApiError(e)) }
    finally { setDetailLoading(false) }
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium text-[#AD4679]">Financeiro / PDV</p><h1 className="text-3xl font-bold">Controle de caixas</h1><p className="text-sm text-gray-500">Sessões e conferências registradas nos terminais do PDV.</p></div><button className="flex gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm" onClick={()=>{setRevision(v=>v+1);if(detail)void openDetail(detail.id)}}><RefreshCw size={16}/>Atualizar</button></header>
    {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {detail ? <div className="space-y-5">
      <button onClick={()=>setDetail(null)} className="flex items-center gap-2 text-sm text-[#AD4679]"><ArrowLeft size={17}/>Voltar ao histórico</button>
      <section className="rounded-2xl border border-gray-200 bg-white p-5"><div className="mb-4 flex items-center gap-3"><Wallet className="text-[#AD4679]"/><h2 className="text-xl font-bold">{detail.terminalCode} — {detail.status==='OPEN'?'Aberto':'Fechado'}</h2></div>
        {detailLoading && <p>Atualizando...</p>}
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-gray-500">Aberto por</p><strong>{detail.openedBy.name}</strong><p>{when(detail.openedAt)}</p></div>
          <div><p className="text-gray-500">Fechado por</p><strong>{detail.closedBy?.name ?? '—'}</strong><p>{when(detail.closedAt)}</p></div>
          <div><p className="text-gray-500">Dinheiro inicial</p><strong>{brl(detail.settlement.openingAmount)}</strong></div>
          <div><p className="text-gray-500">Dinheiro esperado</p><strong>{brl(detail.settlement.expectedCash)}</strong></div>
          <div><p className="text-gray-500">Dinheiro declarado</p><strong>{detail.settlement.declaredCash === null ? '—' : brl(detail.settlement.declaredCash)}</strong></div>
          <div><p className="text-gray-500">Diferença no fechamento</p><strong className={Number(detail.settlement.difference)===0?'text-green-700':'text-red-700'}>{detail.settlement.difference===null?'—':brl(detail.settlement.difference)}</strong></div>
          <div><p className="text-gray-500">Vendas concluídas</p><strong>{detail.settlement.salesCount} — {brl(detail.settlement.salesTotal)}</strong></div>
          <div><p className="text-gray-500">Sangrias / suprimentos</p><strong>{brl(detail.settlement.withdrawals)} / {brl(detail.settlement.supplies)}</strong></div>
        </div>
        {detail.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-gray-600">Observações: {detail.notes}</p>}
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5"><h3 className="mb-4 font-semibold">Formas de pagamento</h3><div className="flex flex-wrap gap-3">{detail.settlement.payments.map(p=><div key={p.method} className="rounded-lg bg-gray-50 px-4 py-3 text-sm"><p>{paymentLabel(p.method)}</p><strong>{brl(p.amount)}</strong><p className="text-xs text-gray-500">{p.count} pagamento(s)</p></div>)}{!detail.settlement.payments.length && <p className="text-sm text-gray-500">Sem pagamentos.</p>}</div></section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5"><h3 className="mb-4 font-semibold">Vendas deste caixa</h3><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="text-gray-500"><th className="py-2">Venda</th><th>Data</th><th>Operador</th><th>Pagamento</th><th>Situação</th><th className="text-right">Valor</th></tr></thead><tbody>{detail.sales.map(s=><tr key={s.id} className="border-t border-gray-100"><td className="py-3">#{s.number}</td><td>{when(s.createdAt)}</td><td>{s.operator.name}</td><td>{s.payments.map(p=>paymentLabel(p.method)).join(', ')}</td><td>{s.status==='COMPLETED'?'Concluída':'Cancelada'}</td><td className="text-right">{brl(s.totalAmount)}</td></tr>)}</tbody></table>{!detail.sales.length && <p className="py-5 text-sm text-gray-400">Nenhuma venda registrada.</p>}</div>
        {detail.sales.map(s=><details key={s.id} className="mt-3 rounded-xl border border-gray-100 p-3 text-sm"><summary className="cursor-pointer font-medium">Itens da venda #{s.number}</summary><div className="mt-3 space-y-1">{s.items.map(i=><p key={i.id}>{i.productName} — {i.quantity} {i.unit} × {brl(i.unitPrice)} = {brl(i.totalAmount)}</p>)}{s.payments.map(p=><p key={p.id} className="text-gray-500">{paymentLabel(p.method)}: {brl(p.amount)} {p.changeAmount!=='0.00'?`(troco ${brl(p.changeAmount)})`:''}</p>)}</div></details>)}
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5"><h3 className="mb-4 font-semibold">Histórico de movimentações</h3><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="text-gray-500"><th className="py-2">Data</th><th>Tipo</th><th>Usuário</th><th>Motivo</th><th className="text-right">Valor</th></tr></thead><tbody>{detail.movements.map(m=><tr key={m.id} className="border-t border-gray-100"><td className="py-3">{when(m.createdAt)}</td><td>{movementLabel(m.type)}</td><td>{m.user.name}</td><td>{m.reason}</td><td className="text-right">{brl(m.amount)}</td></tr>)}</tbody></table>{!detail.movements.length && <p className="py-5 text-sm text-gray-400">Nenhuma movimentação.</p>}</div></section>
    </div> : <>
      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-gray-600">Abertura de<input className="mt-1 w-full rounded-lg border border-gray-200 p-2" type="date" value={start} onChange={e=>setStart(e.target.value)} /></label>
        <label className="text-xs text-gray-600">Abertura até<input className="mt-1 w-full rounded-lg border border-gray-200 p-2" type="date" value={end} onChange={e=>setEnd(e.target.value)} /></label>
        <label className="text-xs text-gray-600">Terminal<input placeholder="CAIXA-01" className="mt-1 w-full rounded-lg border border-gray-200 p-2" value={terminal} onChange={e=>setTerminal(e.target.value)} /></label>
        <label className="text-xs text-gray-600">Situação<select className="mt-1 w-full rounded-lg border border-gray-200 p-2" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option><option value="OPEN">Aberto</option><option value="CLOSED">Fechado</option></select></label>
      </section>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5"><h2 className="mb-4 font-semibold">Histórico de caixas — {pagination.total} registro(s)</h2>{loading && <p className="text-sm text-gray-500">Carregando...</p>}
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="text-gray-500"><th className="py-3">Terminal</th><th>Aberto em</th><th>Aberto por</th><th>Fechado em</th><th>Fechado por</th><th>Status</th><th>Vendas</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t border-gray-100"><td className="py-3 font-medium">{r.terminalCode}</td><td>{when(r.openedAt)}</td><td>{r.openedBy.name}</td><td>{when(r.closedAt)}</td><td>{r.closedBy?.name??'—'}</td><td className={r.status==='OPEN'?'text-green-700':'text-gray-500'}>{r.status==='OPEN'?'Aberto':'Fechado'}</td><td>{r.salesCount}</td><td><button className="rounded-lg bg-[#AD4679]/10 px-3 py-2 font-medium text-[#AD4679]" onClick={()=>void openDetail(r.id)}>Detalhes</button></td></tr>)}</tbody></table>{!loading && rows.length===0 && <p className="py-6 text-center text-gray-400">Nenhum caixa encontrado neste filtro.</p>}</div>
        <div className="mt-4 flex items-center justify-end gap-3 text-sm"><span>Página {pagination.page} de {Math.max(1,pagination.totalPages)}</span><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronLeft size={18}/></button><button disabled={page>=pagination.totalPages} onClick={()=>setPage(p=>p+1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronRight size={18}/></button></div>
      </section>
    </>}
  </div>
}
