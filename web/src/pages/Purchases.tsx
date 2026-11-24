import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, PackagePlus, Plus, RefreshCcw, Search, Truck, X } from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { getApiError } from '../services/management.service'
import { purchasesService } from '../services/purchases.service'
import type { Purchase, PurchaseLine, PurchaseListRow, PurchaseProductOption, PurchaseSupplierOption } from '../services/purchases.service'
import { productsService } from '../services/products.service'
import ProductForm from '../components/products/ProductForm'
import type { ProductInput, ProductOptions } from '../types/product'
import '../styles/products.css'
import '../styles/purchases.css'

const brl = (n: number | string) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const date = (s: string) => new Date(s).toLocaleString('pt-BR')
const normalize = (value: string) => value.trim().replace(',', '.')
const qtyValid = (s: string) => /^\d{1,11}(\.\d{1,3})?$/.test(normalize(s)) && Number(normalize(s)) > 0
const costValid = (s: string) => /^\d{1,10}(\.\d{1,4})?$/.test(normalize(s))
const labelStatus: Record<string,string> = { DRAFT: 'Rascunho', ORDERED: 'Aguardando recebimento', PARTIALLY_RECEIVED: 'Recebido parcialmente', RECEIVED: 'Recebido', CANCELLED: 'Cancelado' }
type DraftLine = { productId: string; name: string; unit: string; quantity: string; unitCost: string }
type ReceiptDraft = { operationId: string; items: Record<string,string> }

export default function Purchases() {
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('purchases.create')
  const canReceive = hasPermission('purchases.receive')
  const canRegisterProduct = hasPermission('products.create') && hasPermission('products.view') && hasPermission('products.price') && hasPermission('products.cost')
  const [rows,setRows] = useState<PurchaseListRow[]>([])
  const [page,setPage] = useState(1)
  const [pages,setPages] = useState(1)
  const [query,setQuery] = useState('')
  const [reload,setReload] = useState(0)
  const [selected,setSelected] = useState<Purchase | null>(null)
  const [createOpen,setCreateOpen] = useState(false)
  const [supplierId,setSupplierId] = useState('')
  const [invoiceNumber,setInvoiceNumber] = useState('')
  const [invoiceSeries,setInvoiceSeries] = useState('')
  const [notes,setNotes] = useState('')
  const [draft,setDraft] = useState<DraftLine[]>([])
  const [suppliers,setSuppliers] = useState<PurchaseSupplierOption[]>([])
  const [products,setProducts] = useState<PurchaseProductOption[]>([])
  const [productSearch,setProductSearch] = useState('')
  const [productId,setProductId] = useState('')
  const [productOptions,setProductOptions] = useState<ProductOptions | null>(null)
  const [newProductOpen,setNewProductOpen] = useState(false)
  const [receiving,setReceiving] = useState<ReceiptDraft | null>(null)
  const [receiptNotes,setReceiptNotes] = useState('')
  const [loading,setLoading] = useState(false)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const refresh = useCallback(() => setReload(x => x + 1), [])
  const draftTotal = useMemo(() => draft.reduce((a, x) => a + Number(normalize(x.quantity) || 0) * Number(normalize(x.unitCost) || 0),0),[draft])

  useEffect(() => {
    let active = true
    setLoading(true)
    purchasesService.list(page,query).then(result => { if(active) {setRows(result.data);setPages(Math.max(1,result.pagination.totalPages))} })
      .catch(e=>{if(active)setError(getApiError(e))}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[page,query,reload])

  const loadOptions = useCallback(async(search = '') => {
    const result = await purchasesService.options(search)
    setSuppliers(result.suppliers)
    setProducts(result.products)
  },[])
  useEffect(()=>{if(!createOpen)return;let cancelled=false;const timer=window.setTimeout(()=>{
    void purchasesService.options(productSearch).then(x=>{if(!cancelled){setSuppliers(x.suppliers);setProducts(x.products)}}).catch(e=>{if(!cancelled)setError(getApiError(e))})
  },250);return()=>{cancelled=true;window.clearTimeout(timer)}},[createOpen,productSearch,reload])

  async function openCreate() {
    setError('');setDraft([]);setSupplierId('');setInvoiceNumber('');setInvoiceSeries('');setNotes('');setProductSearch('');setProductId('');setCreateOpen(true)
    try { await loadOptions() } catch(e){setError(getApiError(e))}
  }
  function addProduct() {
    const p = products.find(x=>x.id===productId)
    if(!p)return
    if (!p.controlStock) {setError('Este produto não controla estoque.');return}
    if(draft.some(x=>x.productId===p.id)){setError('Produto já adicionado. Altere a quantidade na linha existente.');return}
    setDraft(old=>[...old,{productId:p.id,name:p.name,unit:p.unit,quantity:'1',unitCost:String(p.costPrice ?? '0')}]);setProductId('');setError('')
  }
  function changeDraft(id:string,field:'quantity'|'unitCost',value:string){setDraft(old=>old.map(x=>x.productId===id?{...x,[field]:value}:x))}
  async function savePurchase(){
    if(!supplierId){setError('Selecione o fornecedor.');return}
    if(!draft.length){setError('Adicione pelo menos um produto.');return}
    if(draft.some(x=>!qtyValid(x.quantity)||(x.unit==='UN'&&!Number.isInteger(Number(normalize(x.quantity))))||!costValid(x.unitCost))){setError('Verifique quantidades e custos dos itens.');return}
    setSaving(true);setError('')
    try{
      const created = await purchasesService.create({supplierId,invoiceNumber,invoiceSeries,notes,items:draft.map(x=>({productId:x.productId,quantity:normalize(x.quantity),unitCost:normalize(x.unitCost)}))})
      setCreateOpen(false);setSelected(created);setNotice(`Compra #${created.number} registrada. O estoque ainda não foi alterado.`);refresh()
    }catch(e){setError(getApiError(e))}finally{setSaving(false)}
  }
  async function openPurchase(id:string){setLoading(true);setError('');try{setSelected(await purchasesService.get(id));setReceiving(null)}catch(e){setError(getApiError(e))}finally{setLoading(false)}}
  function beginReceipt(p:Purchase){
    setError('');setReceiptNotes('');setReceiving({operationId:crypto.randomUUID(),items:Object.fromEntries(p.items.map(x=>[x.id, x.product.unit==='UN'?'0':'0.000']))})
  }
  function remain(x:PurchaseLine){return Number(x.quantity)-Number(x.receivedQuantity)}
  async function saveReceipt(){
    if(!selected||!receiving)return
    const lines=selected.items.filter(x=>Number(normalize(receiving.items[x.id]||'0'))>0).map(x=>({purchaseItemId:x.id,quantity:normalize(receiving.items[x.id])}))
    if(!lines.length){setError('Informe a quantidade recebida de pelo menos um produto.');return}
    if(lines.some(x=>{const item=selected.items.find(i=>i.id===x.purchaseItemId)!;return !qtyValid(x.quantity)||Number(x.quantity)>remain(item)+1e-8||(item.product.unit==='UN'&&!Number.isInteger(Number(x.quantity)))})){setError('Quantidade inválida ou superior ao saldo pendente.');return}
    if(!window.confirm('Confirmar recebimento? Esta operação aumentará o estoque dos produtos selecionados.'))return
    setSaving(true);setError('')
    try{
      const result=await purchasesService.receive(selected.id,{operationId:receiving.operationId,notes:receiptNotes,items:lines})
      setSelected(result.purchase);setReceiving(null);setNotice(result.duplicated?'Recebimento já confirmado anteriormente. Nenhuma entrada duplicada.':'Mercadorias recebidas e estoque atualizado.');refresh()
    }catch(e){setError(`${getApiError(e)} Se houve falha de conexão, tente novamente sem fechar este formulário: a identificação da operação será mantida.`)}finally{setSaving(false)}
  }
  async function startProductRegistration(){
    setError('');try{const opts=await productsService.getOptions();setProductOptions(opts);setNewProductOpen(true)}catch(e){setError(getApiError(e))}
  }
  async function registerProduct(data:ProductInput){
    const created = await productsService.create(data)
    await loadOptions(created.name)
    setProductSearch(created.name);setProductId(created.id)
    setDraft(old=>[...old,{productId:created.id,name:created.name,unit:created.unit,quantity:'1',unitCost:created.costPrice||'0'}])
    setNewProductOpen(false)
    setNotice('Produto cadastrado e adicionado à compra. Ele entrará no estoque somente após confirmar o recebimento.')
  }

  return <div className="purchase-page">
    <div className="purchase-head"><div><span className="purchase-kicker">ESTOQUE E COMPRAS / RECEBIMENTO</span><h1>Compras e mercadorias</h1><p>Registre compras e confira o recebimento. Sem emissão ou escrituração fiscal.</p></div><div className="purchase-actions"><button onClick={refresh} className="purchase-ghost"><RefreshCcw size={16}/> Atualizar</button>{canCreate&&<button className="purchase-primary" onClick={()=>void openCreate()}><Plus size={16}/> Nova compra</button>}</div></div>
    {notice&&<div role="status" className="purchase-success">{notice}<button onClick={()=>setNotice('')} aria-label="Fechar aviso"><X size={16}/></button></div>}
    {error&&<div role="alert" className="purchase-error">{error}<button onClick={()=>setError('')} aria-label="Fechar erro"><X size={16}/></button></div>}
    <div className="purchase-card"><div className="purchase-list-head"><h2>Histórico de compras</h2><label className="purchase-search"><Search size={17}/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Fornecedor, nº compra ou referência"/></label></div>
      <div className="purchase-table-wrap"><table><thead><tr><th>Compra</th><th>Fornecedor</th><th>Registrada em</th><th>Situação</th><th>Total</th><th></th></tr></thead><tbody>
        {rows.map(r=><tr key={r.id}><td>#{r.number}{r.invoiceNumber&&<small>Ref. {r.invoiceNumber}</small>}</td><td>{r.supplier.name}</td><td>{date(r.createdAt)}</td><td><span className="purchase-tag">{labelStatus[r.status]||r.status}</span></td><td>{brl(r.totalAmount)}</td><td><button onClick={()=>void openPurchase(r.id)} className="purchase-link">Detalhes</button></td></tr>)}
        {!loading&&rows.length===0&&<tr><td colSpan={6} className="purchase-empty">Nenhuma compra encontrada.</td></tr>}
      </tbody></table></div><div className="purchase-pages"><button disabled={page===1} onClick={()=>setPage(n=>n-1)}>Anterior</button><span>Página {page} de {pages}</span><button disabled={page>=pages} onClick={()=>setPage(n=>n+1)}>Próxima</button></div></div>

    {createOpen&&<div className="purchase-overlay"><section className="purchase-modal" role="dialog" aria-modal="true" aria-label="Nova compra"><header><div><h2><Truck size={22}/> Nova compra</h2><p>O estoque muda somente quando a chegada for confirmada.</p></div><button className="purchase-icon" disabled={saving} onClick={()=>setCreateOpen(false)} aria-label="Fechar"><X/></button></header><div className="purchase-body">
      <div className="purchase-grid"><label>Fornecedor *<select value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Selecione</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Número da nota (opcional)<input value={invoiceNumber} maxLength={50} onChange={e=>setInvoiceNumber(e.target.value)} placeholder="Apenas referência administrativa"/></label><label>Série (opcional)<input value={invoiceSeries} maxLength={20} onChange={e=>setInvoiceSeries(e.target.value)}/></label></div>
      <div className="purchase-add"><div><h3>Produtos da compra</h3><p>Pesquise um produto existente ou cadastre um novo sem sair da compra.</p></div><div className="purchase-choose"><input placeholder="Pesquisar nome ou código" value={productSearch} onChange={e=>{setProductSearch(e.target.value);setProductId('')}}/><select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Selecione o produto</option>{products.filter(p=>p.controlStock).map(p=><option key={p.id} value={p.id}>{p.name} · {p.unit} · cód. {p.code}</option>)}</select><button className="purchase-ghost" onClick={addProduct} disabled={!productId}>Adicionar</button>{canRegisterProduct&&<button className="purchase-ghost" onClick={()=>void startProductRegistration()}><PackagePlus size={16}/> Novo produto</button>}</div></div>
      <div className="purchase-table-wrap"><table><thead><tr><th>Produto</th><th>Quantidade</th><th>Custo unitário</th><th>Subtotal</th><th></th></tr></thead><tbody>{draft.map(l=><tr key={l.productId}><td>{l.name}<small>{l.unit}</small></td><td><input aria-label={`Quantidade de ${l.name}`} value={l.quantity} onChange={e=>changeDraft(l.productId,'quantity',e.target.value)} /></td><td><input aria-label={`Custo de ${l.name}`} value={l.unitCost} onChange={e=>changeDraft(l.productId,'unitCost',e.target.value)}/></td><td>{brl(Number(normalize(l.quantity)||0)*Number(normalize(l.unitCost)||0))}</td><td><button className="purchase-icon" onClick={()=>setDraft(x=>x.filter(y=>y.productId!==l.productId))}><X size={17}/></button></td></tr>)}{!draft.length&&<tr><td colSpan={5} className="purchase-empty">Adicione produtos para começar.</td></tr>}</tbody></table></div>
      <label className="purchase-note">Observações<textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={2000}/></label><div className="purchase-sum">Total da compra <strong>{brl(draftTotal)}</strong></div>
      </div><footer><button className="purchase-ghost" disabled={saving} onClick={()=>setCreateOpen(false)}>Cancelar</button><button className="purchase-primary" disabled={saving} onClick={()=>void savePurchase()}>{saving?'Salvando...':'Registrar compra'}</button></footer></section></div>}

    {selected&&<div className="purchase-overlay"><section className="purchase-modal" role="dialog" aria-modal="true" aria-label="Detalhes da compra"><header><div><h2><ClipboardList size={22}/> Compra #{selected.number}</h2><p>{selected.supplier.name} · {labelStatus[selected.status]} · {date(selected.createdAt)}</p></div><button className="purchase-icon" disabled={saving} onClick={()=>{setSelected(null);setReceiving(null)}} aria-label="Fechar"><X/></button></header><div className="purchase-body">
      <div className="purchase-detail"><span>Registrada por: <b>{selected.createdBy.name}</b></span><span>Referência NF: <b>{selected.invoiceNumber||'Não informada'}</b></span><span>Total: <b>{brl(selected.totalAmount)}</b></span></div>
      <h3>Produtos e saldo pendente</h3><div className="purchase-table-wrap"><table><thead><tr><th>Produto</th><th>Comprado</th><th>Recebido</th><th>Pendente</th>{receiving&&<th>Chegou agora</th>}</tr></thead><tbody>{selected.items.map(i=><tr key={i.id}><td>{i.product.name}<small>{i.product.unit}</small></td><td>{i.quantity}</td><td>{i.receivedQuantity}</td><td>{Math.max(0,remain(i)).toLocaleString('pt-BR',{maximumFractionDigits:3})}</td>{receiving&&<td><input aria-label={`Receber ${i.product.name}`} disabled={remain(i)<=0} value={receiving.items[i.id]||'0'} onChange={e=>setReceiving(r=>r?{...r,items:{...r.items,[i.id]:e.target.value}}:null)}/></td>}</tr>)}</tbody></table></div>
      {receiving&&<label className="purchase-note">Observações do recebimento<textarea maxLength={2000} rows={2} value={receiptNotes} onChange={e=>setReceiptNotes(e.target.value)}/></label>}
      <h3>Recebimentos realizados</h3>{!selected.receipts.length?<p className="purchase-muted">Nenhuma mercadoria recebida.</p>:selected.receipts.map(r=><div className="purchase-receipt" key={r.id}><b>{date(r.createdAt)}</b> · {r.receivedBy.name}<small>{r.items.map(i=>`${i.product.name}: ${i.quantity} ${i.product.unit}`).join(' · ')}</small></div>)}
      </div><footer>{receiving?<><button className="purchase-ghost" disabled={saving} onClick={()=>setReceiving(null)}>Cancelar recebimento</button><button className="purchase-primary" disabled={saving} onClick={()=>void saveReceipt()}>{saving?'Processando...':'Confirmar entrada no estoque'}</button></>:<>{canReceive&&selected.status!=='RECEIVED'&&selected.status!=='CANCELLED'&&<button className="purchase-primary" onClick={()=>beginReceipt(selected)}><PackagePlus size={17}/> Receber mercadorias</button>}<button className="purchase-ghost" onClick={()=>setSelected(null)}>Fechar</button></>}</footer></section></div>}
    {newProductOpen&&productOptions&&<ProductForm options={productOptions} canViewCost={true} canChangePrice={true} onClose={()=>setNewProductOpen(false)} onSave={registerProduct}/>}
  </div>
}
