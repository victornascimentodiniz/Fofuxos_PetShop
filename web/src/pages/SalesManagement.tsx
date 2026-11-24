import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { getApiError } from '../services/management.service'
import { brl, localDate, paymentLabel, rangeForDates, reportsService, when } from '../services/reports.service'
import type { Pagination, Sale } from '../types/reports'
const today = () => localDate(new Date())
const monthAgo = () => { const d = new Date(); d.setDate(d.getDate() - 30); return localDate(d) }
export default function SalesManagement() {
  const [start,setStart] = useState(monthAgo)
  const [end,setEnd] = useState(today)
  const [terminal,setTerminal] = useState('')
  const [status,setStatus] = useState('')
  const [page,setPage] = useState(1)
  const [revision,setRevision] = useState(0)
  const [rows,setRows] = useState<Sale[]>([])
  const [pagination,setPagination] = useState<Pagination>({page:1,limit:20,total:0,totalPages:0})
  const [completed,setCompleted] = useState({count:0,total:'0.00'})
  const [selected,setSelected] = useState<Sale|null>(null)
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  useEffect(()=>setPage(1),[start,end,terminal,status])
  useEffect(()=>{
    let active=true
    if(start>end){setError('Intervalo de datas inválido.');return}
    setLoading(true);setError('')
    reportsService.sales({...rangeForDates(start,end),terminal:terminal.trim()||undefined,status:status||undefined,page})
      .then(r=>{if(active){setRows(r.data);setPagination(r.pagination);setCompleted({count:r.completedCount,total:r.completedTotal})}})
      .catch(e=>{if(active){setRows([]);setError(getApiError(e))}})
      .finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[start,end,terminal,status,page,revision])
  async function openSale(id:string){setError('');try{setSelected(await reportsService.sale(id))}catch(e){setError(getApiError(e))}}
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium text-[#AD4679]">PDV / Histórico</p><h1 className="text-3xl font-bold">Vendas realizadas</h1><p className="text-sm text-gray-500">Todas as vendas registradas no aplicativo Windows.</p></div><button onClick={()=>{setRevision(v=>v+1);if(selected)void openSale(selected.id)}} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm"><RefreshCw size={16}/>Atualizar</button></header>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {selected?<div className="space-y-5"><button onClick={()=>setSelected(null)} className="flex gap-2 text-sm text-[#AD4679]"><ArrowLeft size={16}/>Voltar às vendas</button>
      <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="text-xl font-semibold">Venda #{selected.number}</h2><div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><p className="text-gray-500">Data</p><strong>{when(selected.createdAt)}</strong></div><div><p className="text-gray-500">Operador</p><strong>{selected.operator.name}</strong></div><div><p className="text-gray-500">Terminal</p><strong>{selected.cashSession.terminalCode}</strong></div><div><p className="text-gray-500">Sessão</p><strong className="break-all">{selected.cashSession.id}</strong></div><div><p className="text-gray-500">Status</p><strong>{selected.status==='COMPLETED'?'Concluída':'Cancelada'}</strong></div></div>
      <h3 className="mt-6 mb-2 font-semibold">Produtos vendidos</h3><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="text-gray-500"><th className="py-2">Produto</th><th>Quantidade</th><th>Preço unitário</th><th className="text-right">Total</th></tr></thead><tbody>{selected.items.map(i=><tr key={i.id} className="border-t border-gray-100"><td className="py-3">{i.productName}</td><td>{i.quantity} {i.unit}</td><td>{brl(i.unitPrice)}</td><td className="text-right">{brl(i.totalAmount)}</td></tr>)}</tbody></table></div>
      <div className="mt-4 space-y-1 text-right text-sm"><p>Subtotal: {brl(selected.subtotal)}</p><p>Desconto: {brl(selected.discountAmount)}</p><p className="text-lg font-bold">Total: {brl(selected.totalAmount)}</p></div>
      {selected.notes&&<p className="mt-3 text-sm text-gray-500">Observações: {selected.notes}</p>}
      </section><section className="rounded-2xl border border-gray-200 bg-white p-5"><h3 className="mb-4 font-semibold">Pagamentos</h3>{selected.payments.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 py-3 text-sm"><div><strong>{paymentLabel(p.method)}</strong><p className="text-gray-500">{p.reference||'Sem referência'}{p.receivedAmount?` · Recebido: ${brl(p.receivedAmount)} · Troco: ${brl(p.changeAmount)}`:''}</p></div><strong>{brl(p.amount)}</strong></div>)}</section></div> : <>
      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-gray-600">Vendas de<input type="date" className="mt-1 w-full rounded-lg border border-gray-200 p-2" value={start} onChange={e=>setStart(e.target.value)}/></label><label className="text-xs text-gray-600">Vendas até<input type="date" className="mt-1 w-full rounded-lg border border-gray-200 p-2" value={end} onChange={e=>setEnd(e.target.value)}/></label><label className="text-xs text-gray-600">Terminal<input placeholder="CAIXA-01" className="mt-1 w-full rounded-lg border border-gray-200 p-2" value={terminal} onChange={e=>setTerminal(e.target.value)}/></label><label className="text-xs text-gray-600">Situação<select className="mt-1 w-full rounded-lg border border-gray-200 p-2" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todas</option><option value="COMPLETED">Concluídas</option><option value="CANCELLED">Canceladas</option></select></label></section>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-sm text-gray-500">Vendas concluídas no filtro</p><strong className="text-2xl">{completed.count}</strong></div><div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-sm text-gray-500">Total de vendas concluídas</p><strong className="text-2xl">{brl(completed.total)}</strong></div></section>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5"><h2 className="mb-4 font-semibold">Histórico — {pagination.total} registro(s)</h2>{loading&&<p className="text-sm text-gray-500">Carregando...</p>}<div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="text-gray-500"><th className="py-2">Número</th><th>Data/hora</th><th>Operador</th><th>Terminal</th><th>Pagamento</th><th>Status</th><th className="text-right">Total</th><th></th></tr></thead><tbody>{rows.map(s=><tr key={s.id} className="border-t border-gray-100"><td className="py-3 font-medium">#{s.number}</td><td>{when(s.createdAt)}</td><td>{s.operator.name}</td><td>{s.cashSession.terminalCode}</td><td>{s.payments.map(p=>paymentLabel(p.method)).join(', ')}</td><td>{s.status==='COMPLETED'?'Concluída':'Cancelada'}</td><td className="text-right font-semibold">{brl(s.totalAmount)}</td><td><button onClick={()=>void openSale(s.id)} className="rounded-lg bg-[#AD4679]/10 px-3 py-2 font-medium text-[#AD4679]">Detalhes</button></td></tr>)}</tbody></table>{!loading&&!rows.length&&<p className="py-5 text-center text-gray-400">Nenhuma venda encontrada.</p>}</div><div className="mt-4 flex items-center justify-end gap-3 text-sm"><span>Página {pagination.page} de {Math.max(1,pagination.totalPages)}</span><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronLeft size={18}/></button><button disabled={page>=pagination.totalPages} onClick={()=>setPage(p=>p+1)} className="rounded-lg border p-2 disabled:opacity-30"><ChevronRight size={18}/></button></div></section>
    </>}
  </div>
}
