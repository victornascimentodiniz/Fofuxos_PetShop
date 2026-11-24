import { useEffect, useState } from 'react'
import { ArrowRight, AlertTriangle, RefreshCw, ShoppingCart, Wallet, Landmark, ReceiptText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts'
import StatCard from '../components/dashboard/StatCard'
import { getApiError } from '../services/management.service'
import { brl, localDate, paymentLabel, rangeForDates, reportsService, when } from '../services/reports.service'
import type { DashboardData } from '../types/reports'

const COLORS = ['#32B5A5','#AD4679','#64748B','#99DCD8','#E8A45D']
const today = () => localDate(new Date())
const weekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 6); return localDate(d) }
export default function Dashboard() {
  const [start, setStart] = useState(weekAgo)
  const [end, setEnd] = useState(today)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (start > end) { setError('Data inicial posterior à final.'); setLoading(false); return }
    setLoading(true); setError('')
    reportsService.dashboard(rangeForDates(start,end).start, rangeForDates(start,end).end)
      .then((result) => { if (active) setData(result) })
      .catch((e) => { if (active) { setData(null); setError(getApiError(e)) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [start,end,revision])
  const plot = (data?.daily ?? []).map((d) => ({ ...d, receitas: Number(d.total), label: d.day.slice(8,10)+'/'+d.day.slice(5,7) }))
  const payments = (data?.payments ?? []).filter((p) => Number(p.amount) > 0)
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-medium text-[#AD4679]">Painel administrativo</p><h1 className="text-3xl font-bold text-gray-900">Visão geral</h1><p className="mt-1 text-sm text-gray-500">Dados reais das vendas e do caixa, atualizados pelo servidor.</p></div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-gray-600">Início<input className="mt-1 block rounded-lg border border-gray-200 p-2" type="date" value={start} onChange={e=>setStart(e.target.value)} /></label>
        <label className="text-xs text-gray-600">Fim<input className="mt-1 block rounded-lg border border-gray-200 p-2" type="date" value={end} onChange={e=>setEnd(e.target.value)} /></label>
        <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5 text-sm" onClick={()=>setRevision(v=>v+1)}><RefreshCw size={16}/>Atualizar</button>
      </div>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading && <p className="text-sm text-gray-500">Buscando dados reais...</p>}
    {!loading && data && <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Vendas concluídas" value={String(data.totalSales)} description="No período selecionado" icon={ShoppingCart}/>
        <StatCard title="Faturamento bruto de vendas" value={brl(data.revenue)} description="Total após descontos nas vendas" icon={Wallet} variant="secondary"/>
        <StatCard title="Caixas abertos agora" value={String(data.openCashSessions)} description="Todos os terminais" icon={Landmark} variant="neutral"/>
        <StatCard title="Caixas fechados" value={String(data.closedCashSessions)} description="Fechados no período" icon={ReceiptText} variant="neutral"/>
      </section>
      <p className="text-xs text-gray-500">Despesas e lucro não são calculados aqui: ainda não existe conciliação completa de contas a pagar/receber. Faturamento considera somente vendas concluídas.</p>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <article className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-3"><h2 className="font-semibold">Vendas por dia</h2><p className="mb-4 text-sm text-gray-500">Total de vendas concluídas</p>
          {plot.length ? <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={plot}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis/><Tooltip formatter={(v)=>brl(Number(v ?? 0))}/><Bar dataKey="receitas" name="Vendas" fill="#32B5A5"/></BarChart></ResponsiveContainer></div> : <p className="py-16 text-center text-gray-400">Nenhuma venda no período.</p>}
        </article>
        <article className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-2"><h2 className="font-semibold">Formas de pagamento</h2><p className="mb-3 text-sm text-gray-500">Valores efetivamente registrados nas vendas</p>
          {payments.length ? <><div className="h-48"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={payments.map(p=>({name:paymentLabel(p.method),value:Number(p.amount)}))} dataKey="value" nameKey="name" innerRadius={43} outerRadius={78}>{payments.map((p,i)=><Cell key={p.method} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={(v)=>brl(Number(v ?? 0))}/></PieChart></ResponsiveContainer></div><div className="space-y-2">{payments.map((p,i)=><div key={p.method} className="flex items-center justify-between text-sm"><span><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{background:COLORS[i%COLORS.length]}}/>{paymentLabel(p.method)}</span><strong>{brl(p.amount)}</strong></div>)}</div></> : <p className="py-16 text-center text-gray-400">Sem pagamentos no período.</p>}
        </article>
      </section>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-3"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Últimas vendas</h2><Link to="/vendas" className="flex items-center gap-1 text-sm text-[#AD4679]">Ver todas <ArrowRight size={15}/></Link></div>
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-xs text-gray-400"><tr><th className="py-2">Número</th><th>Data</th><th>Operador</th><th>Terminal</th><th className="text-right">Total</th></tr></thead><tbody>{data.recentSales.map(s=><tr key={s.id} className="border-t border-gray-100"><td className="py-3">#{s.number}</td><td>{when(s.createdAt)}</td><td>{s.operator.name}</td><td>{s.cashSession.terminalCode}</td><td className="text-right font-semibold">{brl(s.totalAmount)}</td></tr>)}</tbody></table>{!data.recentSales.length && <p className="py-5 text-center text-gray-400">Nenhuma venda encontrada.</p>}</div>
        </article>
        <article className="rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-2"><div className="mb-4 flex items-center gap-2"><AlertTriangle className="text-amber-600" size={21}/><h2 className="font-semibold">Estoque baixo</h2></div><div className="divide-y divide-gray-100">{data.lowStock.map(p=><div key={p.id} className="flex items-center justify-between gap-2 py-3 text-sm"><div><p className="font-medium">{p.name}</p><p className="text-xs text-gray-400">Mínimo: {p.minStock} {p.unit}</p></div><strong className="text-amber-700">{p.currentStock} {p.unit}</strong></div>)}</div>{!data.lowStock.length && <p className="py-5 text-sm text-gray-400">Nenhum alerta de estoque.</p>}<Link to="/estoque" className="mt-4 flex items-center gap-2 text-sm text-[#AD4679]">Gerenciar estoque<ArrowRight size={14}/></Link></article>
      </section>
    </>}
  </div>
}
