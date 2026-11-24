import { useCallback, useEffect, useState } from 'react'
import {
  Check,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import api from '../services/api'

type Product = { id: string; code: number; name: string; unit: string; salePrice: string }
type Group = { id: string; name: string; icon: string; color: string; sortOrder: number; active: boolean; productIds: string[]; products: Product[] }
type FormState = { name: string; icon: string; color: string; sortOrder: number; active: boolean; productIds: string[] }
const icons = [
  ['package','Produtos'],['bone','Petiscos'],['paw-print','Pet'],['heart','Cuidados'],
  ['toy-brick','Brinquedos'],['shapes','Diversos'],['dog','Cachorros'],['cat','Gatos'],
  ['droplets','Higiene'],['scissors','Tosa'],['gift','Presentes'],['tag','Acessórios'],
]
const blank = ():FormState => ({ name:'', icon:'package', color:'#AD4679', sortOrder:0, active:true, productIds:[] })
const input = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#AD4679]'
function message(e:unknown) { const v=e as {response?:{data?:{message?:string|string[]}};message?:string};const m=v?.response?.data?.message;return Array.isArray(m)?m.join('; '):m||v?.message||'Não foi possível concluir.' }
export default function AttendanceGroups() {
  const [groups,setGroups] = useState<Group[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [editing,setEditing] = useState<string|null>(null)
  const [form,setForm] = useState<FormState>(blank)
  const [query,setQuery] = useState('')
  const [products,setProducts] = useState<Product[]>([])
  const [chosen,setChosen] = useState<Record<string,Product>>({})
  const [searching,setSearching] = useState(false)
  const [saving,setSaving] = useState(false)
  const load = useCallback(async()=>{
    setLoading(true);setError('')
    try { const {data}=await api.get<Group[]>('/attendance-groups');setGroups(data) }
    catch(e){setError(message(e))}finally{setLoading(false)}
  },[])
  useEffect(()=>{void load()},[load])
  useEffect(()=>{
    if(editing===null)return
    let alive=true;const timer=window.setTimeout(async()=>{
      setSearching(true)
      try{const {data}=await api.get<Product[]>('/attendance-groups/catalog-products',{params:{search:query}});if(alive)setProducts(data)}
      catch(e){if(alive)setError(message(e))}finally{if(alive)setSearching(false)}
    },250)
    return ()=>{alive=false;window.clearTimeout(timer)}
  },[editing,query])
  const start=(group?:Group)=>{
    setEditing(group?.id??'new');setQuery('');setError('')
    setForm(group?{name:group.name,icon:group.icon,color:group.color,sortOrder:group.sortOrder,active:group.active,productIds:[...group.productIds]}:blank())
    setChosen(Object.fromEntries((group?.products??[]).map(p=>[p.id,p])))
  }
  const toggle=(product:Product)=>{
    setChosen(prev=>({...prev,[product.id]:product}))
    setForm(prev=>({...prev,productIds:prev.productIds.includes(product.id)?prev.productIds.filter(id=>id!==product.id):[...prev.productIds,product.id]}))
  }
  const save=async()=>{
    if(form.name.trim().length<2){setError('Digite um nome para o grupo.');return}
    setSaving(true);setError('')
    try{
      const payload={...form,name:form.name.trim()}
      if(editing==='new')await api.post('/attendance-groups',payload)
      else await api.patch(`/attendance-groups/${editing}`,payload)
      setEditing(null);await load()
    }catch(e){setError(message(e))}finally{setSaving(false)}
  }
  return <div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm font-medium text-[#AD4679]">Cadastros / PDV</p><h1 className="text-3xl font-bold">Grupos de atendimento</h1><p className="mt-1 text-sm text-gray-500">Organize atalhos de produtos para a tela de vendas, independentemente das categorias de estoque.</p></div>
      <div className="flex gap-2"><button onClick={()=>void load()} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"><RefreshCw size={17}/>Atualizar</button><button onClick={()=>start()} className="flex items-center gap-2 rounded-xl bg-[#AD4679] px-4 py-3 text-sm font-semibold text-white"><Plus size={17}/>Novo grupo</button></div>
    </header>
    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {loading?<p className="flex items-center gap-2 text-sm text-gray-500"><LoaderCircle size={18} className="animate-spin"/>Carregando grupos...</p>:
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map(g=><article key={g.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl text-xl font-black" style={{backgroundColor:`${g.color}18`,color:g.color}}>{g.name.slice(0,1).toUpperCase()}</div><div><h2 className="font-bold">{g.name}</h2><p className="text-xs text-gray-500">{g.products.length} produto(s) · ordem {g.sortOrder}</p></div></div><span className={`rounded-full px-2 py-1 text-xs ${g.active?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}`}>{g.active?'Ativo':'Inativo'}</span></div>
        <p className="mt-4 line-clamp-2 min-h-10 text-sm text-gray-500">{g.products.length?g.products.slice(0,5).map(p=>p.name).join(' · '):'Nenhum produto adicionado.'}</p>
        <button onClick={()=>start(g)} className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-[#AD4679]"><Pencil size={15}/>Editar produtos e grupo</button>
      </article>)}
      {!groups.length&&<div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center"><Layers3 className="mx-auto mb-3 text-[#AD4679]" size={32}/><p>Nenhum grupo cadastrado. Comece criando Brinquedos, Rações ou Petiscos.</p></div>}
    </section>}
    {editing!==null&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-3" role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Editar grupo" className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b p-5"><div><h2 className="text-xl font-bold">{editing==='new'?'Novo grupo':'Editar grupo'}</h2><p className="text-sm text-gray-500">A alteração será exibida no PDV após atualizar os grupos.</p></div><button aria-label="Fechar" onClick={()=>setEditing(null)}><X size={23}/></button></header>
        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className="space-y-4"><label className="block text-sm font-semibold">Nome do grupo<input maxLength={80} className={`${input} mt-2`} placeholder="Ex.: Brinquedos" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label>
            <label className="block text-sm font-semibold">Ícone<select className={`${input} mt-2`} value={form.icon} onChange={e=>setForm(v=>({...v,icon:e.target.value}))}>{icons.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
            <label className="flex items-center gap-3 text-sm font-semibold">Cor <input type="color" value={form.color} onChange={e=>setForm(v=>({...v,color:e.target.value}))} className="h-10 w-16 cursor-pointer"/></label>
            <label className="block text-sm font-semibold">Ordem de exibição<input className={`${input} mt-2`} type="number" min={0} max={9999} value={form.sortOrder} onChange={e=>setForm(v=>({...v,sortOrder:Math.max(0,Number(e.target.value)||0)}))}/></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e=>setForm(v=>({...v,active:e.target.checked}))}/>Grupo ativo no PDV</label>
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-900">Apenas produtos ativos aparecem no PDV. Um produto pode pertencer a vários grupos, sem mudar seu estoque ou preço.</div>
          </div>
          <div className="flex min-h-[330px] flex-col"><h3 className="font-bold">Produtos selecionados ({form.productIds.length})</h3><div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">{form.productIds.map(id=><button key={id} title="Remover" onClick={()=>setForm(v=>({...v,productIds:v.productIds.filter(x=>x!==id)}))} className="flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs text-[#AD4679]">{chosen[id]?.name??id}<X size={12}/></button>)}{!form.productIds.length&&<p className="text-xs text-gray-500">Nenhum produto selecionado.</p>}</div>
            <label className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2"><Search size={17} className="text-gray-400"/><input className="min-w-0 flex-1 text-sm outline-none" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Procurar nome ou código..."/></label>
            <p className="mt-2 text-xs text-gray-500">Exibindo até 100 produtos por pesquisa. {searching?'Buscando...':''}</p>
            <div className="mt-2 max-h-[340px] flex-1 overflow-y-auto rounded-xl border border-gray-200">{products.map(p=><button key={p.id} className="flex w-full items-center justify-between gap-2 border-b p-3 text-left hover:bg-rose-50" onClick={()=>toggle(p)}><span className="min-w-0 text-sm"><strong className="block truncate">{p.name}</strong><small className="text-gray-500">Cód. {p.code} · {p.unit} · R$ {p.salePrice}</small></span><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${form.productIds.includes(p.id)?'bg-[#AD4679] text-white':'border border-gray-300'}`}>{form.productIds.includes(p.id)&&<Check size={15}/>}</span></button>)}{!products.length&&!searching&&<p className="p-4 text-sm text-gray-500">Nenhum produto encontrado.</p>}</div>
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t p-4"><button className="rounded-xl border px-5 py-3 text-sm" disabled={saving} onClick={()=>setEditing(null)}>Cancelar</button><button className="rounded-xl bg-[#AD4679] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={()=>void save()}>{saving?'Salvando...':'Salvar grupo'}</button></footer>
      </div>
    </div>}
  </div>
}
