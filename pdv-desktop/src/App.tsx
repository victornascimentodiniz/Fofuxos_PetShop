import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PawPrint, ShoppingCart, Wallet, History, Search, Plus, Minus, Trash2, CreditCard, Banknote, QrCode, Lock, Unlock, Package, Scale, X, CheckCircle2, AlertTriangle, LogOut, LoaderCircle, RefreshCw, ArrowUpFromLine, ArrowDownToLine, Bone, Heart, ToyBrick, Shapes, Dog, Cat, Droplets, Scissors, Gift, Tag, ChevronRight, Keyboard } from 'lucide-react'
import { api, money, decimal, validMoney } from './api'
import type { Operator, PosLoginOperator, Product, Cash, Sale, PageData } from './api'

type AttendanceGroup = { id: string; name: string; icon: string; color: string; sortOrder: number; products: Product[] }
type GroupView = 'groups' | 'products'
type Page = 'venda' | 'caixa' | 'historico'
type CartItem = { product: Product; quantity: number }
type Payment = 'CASH' | 'PIX' | 'DEBIT_CARD' | 'CREDIT_CARD'
type PendingSale = { clientRequestId: string; terminalCode: string; items: { productId: string; quantity: string }[]; payments: { method: Payment; amount: string; receivedAmount?: string }[] }
const terminalCode = 'CAIXA-01'
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
const calculateItem = (item: CartItem) => Math.round((Number(item.product.salePrice) * item.quantity + Number.EPSILON) * 100) / 100
const readError = (e: unknown) => e instanceof Error ? e.message : 'Erro inesperado.'
function AttendanceIcon({ icon, size = 26 }: { icon: string; size?: number }) {
  switch (icon) {
    case 'bone': return <Bone size={size}/>
    case 'paw-print': return <PawPrint size={size}/>
    case 'heart': return <Heart size={size}/>
    case 'toy-brick': return <ToyBrick size={size}/>
    case 'shapes': return <Shapes size={size}/>
    case 'dog': return <Dog size={size}/>
    case 'cat': return <Cat size={size}/>
    case 'droplets': return <Droplets size={size}/>
    case 'scissors': return <Scissors size={size}/>
    case 'gift': return <Gift size={size}/>
    case 'tag': return <Tag size={size}/>
    default: return <Package size={size}/>
  }
}

export default function App() {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginOperators, setLoginOperators] = useState<PosLoginOperator[]>([])
  const [operatorsLoading, setOperatorsLoading] = useState(true)
  const [operatorsError, setOperatorsError] = useState('')
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const productSearchRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState<Page>('venda')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [cash, setCash] = useState<Cash | null>(null)
  const [cashLoginAlert, setCashLoginAlert] = useState<'closed' | 'another-operator' | null>(null)
  const cashBelongsToOperator = !!cash && !!operator && cash.openedById === operator.id
  const [products, setProducts] = useState<Product[]>([])
  const [attendanceGroups, setAttendanceGroups] = useState<AttendanceGroup[]>([])
  const [attendanceGroupId, setAttendanceGroupId] = useState<string | null>(null)
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupsError, setGroupsError] = useState('')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [weightProduct, setWeightProduct] = useState<Product | null>(null)
  const [weight, setWeight] = useState('0,500')
  const [opening, setOpening] = useState('100.00')
  const [closeAmount, setCloseAmount] = useState('')
  const [cashModal, setCashModal] = useState<'open' | 'close' | 'supply' | 'withdrawal' | null>(null)
  const [movementAmount, setMovementAmount] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [payment, setPayment] = useState<Payment>('PIX')
  const [received, setReceived] = useState('')
  const [pending, setPending] = useState<PendingSale | null>(null)
  const [history, setHistory] = useState<Sale[]>([])
  const [lastSale, setLastSale] = useState<Sale | null>(null)
  const total = useMemo(() => cart.reduce((sum, item) => sum + calculateItem(item), 0), [cart])
  const can = (code: string) => !!operator?.permissions?.includes(code)
  // Atalho seguro: F2 foca a pesquisa na tela de vendas, sem alterar o caixa.
  useEffect(() => {
    if (!operator || page !== 'venda' || cashLoginAlert || cashModal || weightProduct) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault()
        productSearchRef.current?.focus()
        productSearchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [operator, page, cashLoginAlert, cashModal, weightProduct])


  // Login em janela normal; depois da autenticacao, maximiza o PDV.
  // Ao sair da sessao, restaura o tamanho anterior do login.
  useEffect(() => {
    void window.fofuxos?.windowMode(operator ? 'pdv' : 'login')
  }, [operator])

  const refreshLoginOperators = useCallback(async () => {
    setOperatorsLoading(true)
    setOperatorsError('')
    try {
      const users = await api<PosLoginOperator[]>('GET', '/auth/pos-operators')
      setLoginOperators(users)
    } catch (e) {
      setOperatorsError(readError(e))
      setLoginOperators([])
    } finally { setOperatorsLoading(false) }
  }, [])

  useEffect(() => {
    if (!operator) void refreshLoginOperators()
  }, [operator, refreshLoginOperators])

  function selectLoginOperator(person: PosLoginOperator) {
    if (busy) return
    setUsername(person.username)
    setPassword('')
    setError('')
    passwordInputRef.current?.focus()
  }

  const refreshCash = useCallback(async () => {
    const result = await api<Cash | null>('GET', `/pos/cash/current?terminalCode=${terminalCode}`)
    setCash(result)
    return result
  }, [])
  const refreshProducts = useCallback(async (term = '') => {
    const result = await api<Product[]>('GET', `/pos/sales/products?search=${encodeURIComponent(term)}`)
    setProducts(result)
  }, [])
  const refreshAttendanceGroups = useCallback(async () => {
    setGroupsLoading(true)
    setGroupsError('')
    try {
      const result = await api<AttendanceGroup[]>('GET', '/pos/attendance-groups')
      setAttendanceGroups(result)
    } catch (e) {
      setGroupsError(readError(e))
      setAttendanceGroups([])
    } finally {
      setGroupsLoading(false)
    }
  }, [])
  const refreshHistory = useCallback(async () => {
    const result = await api<PageData<Sale>>('GET', `/pos/sales?terminalCode=${terminalCode}&page=1&limit=30`)
    setHistory(result.data)
  }, [])

  useEffect(() => {
    if (!operator) return
    let cancelled = false
    const id = window.setTimeout(() => {
      void refreshProducts(search).catch((e) => { if (!cancelled) setError(readError(e)) })
    }, 280)
    return () => { cancelled = true; window.clearTimeout(id) }
  }, [operator, search, refreshProducts])
  useEffect(() => {
    if (operator && page === 'historico') void refreshHistory().catch((e) => setError(readError(e)))
  }, [operator, page, refreshHistory])

  useEffect(() => {
    if (operator) void refreshAttendanceGroups()
    else { setAttendanceGroups([]); setAttendanceGroupId(null); setGroupsError('') }
  }, [operator, refreshAttendanceGroups])

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const loginData = await api<unknown>('POST', '/auth/login', { username: username.trim(), password })
      let user = (loginData as { user?: Operator })?.user
      if (!user) {
        try {
          const me = await api<Operator | { user: Operator }>('GET', '/auth/me')
          user = 'user' in me ? me.user : me
        } catch { /* A API pode retornar o usuário diretamente no login. */ }
      }
      if (!user || !Array.isArray(user.permissions)) throw new Error('Autenticado, mas a API não retornou o usuário com suas permissões. Verifique os endpoints /auth/login e /auth/me.')
      if (user.mustChangePassword) throw new Error('Este usuário precisa trocar a senha pelo gerencial antes de usar o PDV.')
      if (!user.permissions.includes('pos.access')) throw new Error('Seu perfil não possui permissão pos.access.')
      // Consulte a sessao antes de liberar as operacoes do PDV.
      // A verificacao do caixa e feita APOS a autenticacao.
      const currentCash = await refreshCash()
      setAttendanceGroupId(null); setOperator(user); setPassword(''); setCart([]); setPage(currentCash?.openedById === user.id ? 'venda' : 'caixa')
      if (!currentCash) {
        setCashLoginAlert('closed')
        setNotice('Login realizado. Abra seu caixa para comecar as operacoes.')
      } else if (currentCash.openedById !== user.id) {
        setCashLoginAlert('another-operator')
        setNotice('Existe um caixa aberto neste terminal por outro operador.')
      } else {
        setCashLoginAlert(null)
        setNotice('Login realizado. Seu caixa ja esta aberto: voce pode vender.')
      }
    } catch (e) {
      setError(readError(e))
      await window.fofuxos?.clearSession()
      setOperator(null); setCashLoginAlert(null); setCash(null)
    } finally { setBusy(false) }
  }
  async function logout() {
    if (pending) { setError('Resolva a venda pendente antes de encerrar a sessão.'); return }
    try { await api('POST', '/auth/logout', {}) } catch { /* encerra ao menos a sessão local */ }
    await window.fofuxos.clearSession(); setOperator(null); setCart([]); setCash(null); setCashLoginAlert(null); setHistory([]); setNotice(''); setError('')
  }
  function addItem(product: Product, quantity = 1) {
    if (pending) { setError('Existe uma venda pendente. Reenvie-a antes de alterar o carrinho.'); return }
    if (!cashBelongsToOperator) { setPage('caixa'); setError('Voce precisa ter um caixa aberto em seu nome para vender.'); return }
    if (!can('pos.sell')) { setError('Usuário sem permissão pos.sell.'); return }
    setCart((old) => {
      const current = old.find((x) => x.product.id === product.id)
      return current
        ? old.map((x) => x.product.id === product.id ? { ...x, quantity: Math.round((x.quantity + quantity) * 1000) / 1000 } : x)
        : [...old, { product, quantity }]
    })
    setError('')
  }
  function editQuantity(id: string, delta: number) {
    if (pending) return
    setCart((old) => old.map((x) => x.product.id === id ? { ...x, quantity: Math.max(1, x.quantity + delta) } : x))
  }
  function saveWeight() {
    if (!weightProduct) return
    const n = decimal(weight)
    if (!/^\d{1,11}(\.\d{1,3})?$/.test(n) || Number(n) <= 0) { setError('Digite o peso com até três casas decimais.'); return }
    addItem(weightProduct, Number(n)); setWeightProduct(null)
  }
  async function cashAction() {
    if (!cashModal) return
    setBusy(true); setError('')
    try {
      if (cashModal !== 'open' && !cashBelongsToOperator) throw new Error('Somente o operador que abriu este caixa pode realizar esta operacao.')
      if (cashModal === 'open') {
        if (!validMoney(opening)) throw new Error('Valor inicial inválido.')
        await api('POST', '/pos/cash/open', { terminalCode, openingAmount: decimal(opening) })
      } else if (cashModal === 'close') {
        if (cart.length || pending) throw new Error('Conclua ou limpe a venda atual antes de fechar o caixa.')
        if (!validMoney(closeAmount)) throw new Error('Informe o valor contado em dinheiro.')
        await api('POST', '/pos/cash/close', { terminalCode, closingDeclaredAmount: decimal(closeAmount) })
      } else {
        if (!validMoney(movementAmount, false) || movementReason.trim().length < 3) throw new Error('Informe valor maior que zero e motivo com três caracteres ou mais.')
        await api('POST', `/pos/cash/${cashModal}`, { terminalCode, amount: decimal(movementAmount), reason: movementReason.trim() })
      }
      setCashModal(null); setMovementAmount(''); setMovementReason('')
      const currentCash = await refreshCash()
      if (cashModal === 'open' && currentCash?.openedById === operator?.id) {
        setCashLoginAlert(null)
        setPage('venda')
        setNotice('Seu caixa foi aberto! Agora voce pode registrar vendas.')
      } else if (cashModal === 'close') {
        setCashLoginAlert('closed')
        setPage('caixa')
        setNotice('Caixa fechado. Abra um novo caixa antes de voltar a vender.')
      } else {
        setNotice('Operação de caixa registrada no servidor.')
      }
    } catch (e) { setError(readError(e)) } finally { setBusy(false) }
  }
  function buildSale(): PendingSale {
    if (cart.length === 0 || total <= 0) throw new Error('Adicione produtos antes de finalizar.')
    if (payment === 'CASH' && (!validMoney(received) || Number(decimal(received)) < total)) throw new Error('Informe um valor recebido igual ou superior ao total da venda.')
    return {
      clientRequestId: crypto.randomUUID(), terminalCode,
      items: cart.map((x) => ({ productId: x.product.id, quantity: x.quantity.toFixed(3) })),
      payments: [{ method: payment, amount: total.toFixed(2), ...(payment === 'CASH' ? { receivedAmount: Number(decimal(received)).toFixed(2) } : {}) }],
    }
  }
  async function finalize() {
    if (!cashBelongsToOperator || !can('pos.sell') || busy) {
      if (!cashBelongsToOperator) { setPage('caixa'); setError('Abra seu caixa antes de finalizar uma venda.') }
      return
    }
    let sale: PendingSale
    try { sale = pending || buildSale() } catch (e) { setError(readError(e)); return }
    if (!pending && !window.confirm(`Confirmar venda de ${money(total)} via ${payment}?\n\nATENÇÃO: esta operação grava uma venda real, registra o pagamento e desconta o estoque no banco de dados. Para Pix/cartão, confirme o recebimento antes.`)) return
    setPending(sale); setBusy(true); setError(''); setNotice('')
    try {
      const result = await api<Sale>('POST', '/pos/sales', sale)
      setLastSale(result); setPending(null); setCart([]); setReceived('')
      setNotice(`Venda #${result.number} registrada com sucesso no servidor (${money(result.totalAmount)}).`)
      await Promise.allSettled([refreshCash(), refreshProducts(search)])
    } catch (e) {
      setError(`${readError(e)} A venda pode ter sido registrada; use "Reenviar mesma venda" para confirmar sem duplicar.`)
    } finally { setBusy(false) }
  }
  const paymentMethods: { id: Payment; label: string }[] = [
    { id: 'PIX', label: 'Pix' }, { id: 'CASH', label: 'Dinheiro' },
    { id: 'DEBIT_CARD', label: 'Débito' }, { id: 'CREDIT_CARD', label: 'Crédito' },
  ]
  if (!operator) return (
    <div className="loginbg">
      <div className="login-layout">
        <form className="loginpanel" onSubmit={(e) => void login(e)}>
          <div className="logo"><div className="logoicon"><PawPrint size={27}/></div><div><strong>Fofuxos</strong><small>PDV Desktop · Terminal {terminalCode}</small></div></div>
          <div className="login-welcome"><span className="login-eyebrow">ACESSO AO CAIXA</span><h2>Bem-vindo(a)!</h2><p>Selecione seu usuário ao lado ou digite o login. Depois informe sua senha para entrar.</p></div>
          {error && <div className="errorline"><AlertTriangle size={17}/><span>{error}</span></div>}
          <label htmlFor="pdv-username">Usuário</label>
          <input id="pdv-username" autoComplete="username" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Digite ou selecione um usuário" required disabled={busy}/>
          <label htmlFor="pdv-password">Senha</label>
          <input id="pdv-password" ref={passwordInputRef} type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Digite sua senha" required disabled={busy}/>
          <button className="primary" type="submit" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<Unlock size={17}/>} {busy?'Entrando...':'Entrar no PDV'}</button>
          <button className="login-exit" type="button" disabled={busy} onClick={() => void window.fofuxos.quit()}><LogOut size={17}/> Sair do aplicativo</button>
          <small className="hint"><Lock size={13}/> Selecionar um usuário não dispensa a senha. O login continua protegido pela API.</small>
        </form>
        <section className="login-operators" aria-label="Escolher operador">
          <div className="login-operators-header">
            <div><span className="login-eyebrow">ACESSO RÁPIDO</span><h2>Escolha seu usuário</h2><p>Funcionários ativos com acesso ao PDV.</p></div>
            <button type="button" className="login-refresh" disabled={operatorsLoading} onClick={() => void refreshLoginOperators()} title="Atualizar usuários" aria-label="Atualizar usuários"><RefreshCw size={18} className={operatorsLoading?'spin':''}/></button>
          </div>
          {operatorsError && <div className="errorline"><AlertTriangle size={16}/><span>Não foi possível carregar usuários: {operatorsError}. Você ainda pode digitar seu login manualmente.</span></div>}
          <div className="login-operators-grid">
            {operatorsLoading ? <p className="operators-placeholder"><LoaderCircle className="spin" size={20}/> Buscando usuários ativos...</p> :
              loginOperators.length === 0 ? <p className="operators-placeholder">Nenhum usuário habilitado para o PDV foi encontrado. Confira os perfis no gerencial ou digite o login manualmente.</p> :
              loginOperators.map(person => (
                <button type="button" key={person.username} className={`login-operator-card ${username===person.username?'selected':''}`} disabled={busy} onClick={()=>selectLoginOperator(person)} aria-pressed={username===person.username}>
                  <span className="operator-avatar" aria-hidden="true">{person.name.trim().slice(0,1).toLocaleUpperCase('pt-BR')}</span>
                  <strong title={person.name}>{person.name}</strong>
                  <small>@{person.username}</small>
                  {username===person.username && <CheckCircle2 size={16} className="operator-selected" aria-hidden="true"/>}
                </button>
              ))}
          </div>
          <div className="login-operators-footer"><Lock size={15}/> Cada funcionário deve informar sua própria senha.</div>
        </section>
      </div>
    </div>
  )
  return <div className="shell"><aside className="sidebar"><div className="logo"><div className="logoicon"><PawPrint size={25}/></div><div><strong>Fofuxos</strong><small>PDV Desktop</small></div></div><div className="divider"/><div className="sectionlabel">OPERAÇÃO</div><button className={'nav '+(page==='venda'?'active':'')} onClick={()=>{if (!cashBelongsToOperator) {setPage('caixa');setCashLoginAlert(cash ? 'another-operator' : 'closed')} else setPage('venda')}}><ShoppingCart size={19}/> Nova venda</button><button className={'nav '+(page==='caixa'?'active':'')} onClick={()=>setPage('caixa')}><Wallet size={19}/> Controle de caixa</button><button className={'nav '+(page==='historico'?'active':'')} onClick={()=>setPage('historico')}><History size={19}/> Histórico de vendas</button><div className="sidebottom"><div className="statusdot"><span className="dot"/> API CONECTADA · {terminalCode}</div><div className="operator"><div className="avatar">{operator.name?.slice(0,2).toUpperCase()}</div><div><strong>{operator.name}</strong><small>Operador autenticado</small></div><button title="Sair" onClick={()=>void logout()}><LogOut size={19}/></button></div></div></aside><main><header className="topbar"><div><span className="eyebrow">CAIXA / FOFUXOS PDV</span><h1>{page==='venda'?'Frente de caixa':page==='caixa'?'Controle de caixa':'Histórico de vendas'}</h1></div><div className="headeractions"><button className="secondary small" onClick={()=>void refreshCash().then(result=>{if (!result) {setCashLoginAlert('closed');setPage('caixa')} else if (result.openedById !== operator.id) {setCashLoginAlert('another-operator');setPage('caixa')} else setCashLoginAlert(null)}).catch(e=>setError(readError(e)))}><RefreshCw size={15}/> Atualizar caixa</button><span className={'pill '+(cashBelongsToOperator?'pillgreen':'pillgray')}>{cash?<Unlock size={16}/>:<Lock size={16}/>} Caixa {cashBelongsToOperator?'liberado':cash?'de outro operador':'fechado'}</span></div></header><div className="mainbody"><div className="demo"><AlertTriangle size={18}/><div><strong>Etapa de integração e testes.</strong> As operações enviam dados reais à API e podem alterar o estoque. Não utilize com clientes finais até validar o fluxo, a emissão fiscal e os meios de pagamento. Pix/cartão devem ser confirmados fora deste aplicativo nesta etapa.</div></div>{error&&<div className="errorline"><AlertTriangle size={18}/><span>{error}</span><button onClick={()=>setError('')}><X size={18}/></button></div>}{notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice('')}><X size={18}/></button></div>}
  {page==='venda'&&<div className="salesgrid"><section className="leftpane panel panelsearch"><div className="heading"><div><span className="pos-kicker">CATÁLOGO RÁPIDO</span><h2>Escolha os produtos</h2><p>Selecione um grupo ou pesquise pelo nome ou código.</p></div><span className="badge">{search.trim() ? `${products.length} encontrados` : `${attendanceGroups.length} grupos`}</span></div><div className="search"><Search size={20}/><input ref={productSearchRef} autoFocus value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Pesquisar nome, código ou bipar produto..." aria-label="Pesquisar produtos"/><span className="search-key"><Keyboard size={13}/> F2</span></div><div className="attendance-browser">
      {search.trim() ? <div className="products attendance-products-list">
        {products.map(p=><button className="product" key={p.id} disabled={!cashBelongsToOperator || !!pending} onClick={()=>p.saleType==='WEIGHT'?(setWeightProduct(p),setWeight('0,500')):addItem(p)}><div className="producticon">{p.saleType==='WEIGHT'?<Scale size={22}/>:<Package size={22}/>}</div><div className="productdata"><strong>{p.name}</strong><small>Cód. {p.code} · {p.unit} · Estoque {fmt(Number(p.currentStock))}</small></div><div className="productright"><strong>{money(p.salePrice)}</strong><small>por {p.unit}</small></div><Plus size={17}/></button>)}
        {!products.length&&<p className="attendance-empty">Nenhum produto encontrado para essa pesquisa.</p>}
      </div> : <>
        <div className="attendance-toolbar">
          {attendanceGroupId ? <button type="button" className="attendance-back" onClick={()=>setAttendanceGroupId(null)}>← Todos os grupos</button> : <span className="attendance-label">GRUPOS DE ATENDIMENTO</span>}
          <button type="button" className="attendance-refresh" disabled={groupsLoading} onClick={()=>void refreshAttendanceGroups()}><RefreshCw size={14} className={groupsLoading?'spin':''}/> Atualizar</button>
        </div>
        {groupsError&&<p className="attendance-error">Não foi possível carregar os grupos: {groupsError}. Você pode buscar os produtos pelo campo acima.</p>}
        {attendanceGroupId===null ? <div className="attendance-groups-grid">
          {attendanceGroups.map(g=><button className="attendance-tile" type="button" key={g.id} disabled={!cashBelongsToOperator||!!pending} onClick={()=>setAttendanceGroupId(g.id)} style={{'--group-accent':g.color} as React.CSSProperties}><div className="attendance-tile-icon"><AttendanceIcon icon={g.icon}/></div><strong>{g.name}</strong><small>{g.products.length} produto(s)</small></button>)}
          {!attendanceGroups.length&&!groupsLoading&&<div className="attendance-empty">Nenhum grupo ativo cadastrado. Cadastre em Fofuxos Gestão → Grupos de atendimento, ou pesquise pelo campo acima.</div>}
          {groupsLoading&&<div className="attendance-empty"><LoaderCircle size={18} className="spin"/> Atualizando grupos...</div>}
        </div> : <div className="products attendance-products-list">
          <h3 className="attendance-group-title">{attendanceGroups.find(g=>g.id===attendanceGroupId)?.name||'Produtos do grupo'} <span>• Clique em um produto para adicionar <ChevronRight size={14}/></span></h3>
          {(attendanceGroups.find(g=>g.id===attendanceGroupId)?.products||[]).map(p=><button className="product" key={p.id} disabled={!cashBelongsToOperator || !!pending} onClick={()=>p.saleType==='WEIGHT'?(setWeightProduct(p),setWeight('0,500')):addItem(p)}><div className="producticon">{p.saleType==='WEIGHT'?<Scale size={22}/>:<Package size={22}/>}</div><div className="productdata"><strong>{p.name}</strong><small>Cód. {p.code} · {p.unit} · Estoque {fmt(Number(p.currentStock))}</small></div><div className="productright"><strong>{money(p.salePrice)}</strong><small>por {p.unit}</small></div><Plus size={17}/></button>)}
          {!(attendanceGroups.find(g=>g.id===attendanceGroupId)?.products.length)&&<p className="attendance-empty">Este grupo ainda não possui produtos ativos.</p>}
        </div>}
      </>}
    </div></section><section className="rightpane panel"><div className="heading"><div><span className="pos-kicker">SEU ATENDIMENTO</span><h2>Venda atual</h2><p>{cart.length} produto(s) · {cart.reduce((sum, item) => sum + item.quantity, 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} unidade(s)/kg</p></div><button className="iconbutton" disabled={!!pending} title="Limpar" onClick={()=>setCart([])}><Trash2 size={18}/></button></div><div className="cart">{cart.length===0?<div className="empty"><ShoppingCart size={48}/><h3>Carrinho vazio</h3><p>Selecione os produtos para começar.</p></div>:cart.map(x=><div className="cartitem" key={x.product.id}><div className="carttop"><div><strong>{x.product.name}</strong><small>{money(x.product.salePrice)} / {x.product.unit}</small></div><button className="remove" disabled={!!pending} onClick={()=>setCart(v=>v.filter(a=>a.product.id!==x.product.id))}><X size={17}/></button></div><div className="cartbottom"><div className="qty">{x.product.saleType==='UNIT'?<><button disabled={!!pending} onClick={()=>editQuantity(x.product.id,-1)}><Minus size={15}/></button><strong>{x.quantity}</strong><button disabled={!!pending} onClick={()=>editQuantity(x.product.id,1)}><Plus size={15}/></button></>:<span>{fmt(x.quantity)} kg</span>}</div><strong>{money(calculateItem(x))}</strong></div></div>)}</div><div className="payment"><span>Forma de pagamento</span><div className="paymentbuttons">{paymentMethods.map(p=><button key={p.id} disabled={!!pending} className={payment===p.id?'selected':''} onClick={()=>setPayment(p.id)}>{p.id==='PIX'?<QrCode size={17}/>:p.id==='CASH'?<Banknote size={17}/>:<CreditCard size={17}/>} {p.label}</button>)}</div>{payment==='CASH'&&<label className="cashreceived">Dinheiro recebido (R$)<input disabled={!!pending} value={received} onChange={e=>setReceived(e.target.value)} placeholder="Ex.: 100.00"/><small>Troco estimado: {money(Math.max(0,Number(decimal(received)||0)-total))}</small></label>}</div><div className="total"><div><span>Total estimado</span><strong>{money(total)}</strong></div><button className="primary" disabled={!cashBelongsToOperator||!cart.length||busy||!can('pos.sell')} onClick={()=>void finalize()}>{busy?<LoaderCircle size={18} className="spin"/>:<CreditCard size={18}/>} {pending?'Reenviar mesma venda':'Finalizar venda'}</button><small>O preço e os totais definitivos são calculados pela API.</small>{lastSale&&<small>Última venda confirmada: #{lastSale.number}</small>}</div></section></div>}
  {page==='caixa'&&<div className="cashcontent"><div className="panel cashcard"><div className="cashicon"><Wallet size={30}/></div><span className="eyebrow">CONTROLE DE TURNO</span><h2>{cash?`Caixa ${terminalCode} aberto`:'O caixa está fechado'}</h2><p>{cash?`Aberto com ${money(cash.openingAmount)}. Dinheiro esperado: ${money(cash.summary?.expectedCash||'0')}.`:'Para vender, abra um caixa no servidor.'}</p><div className="cashbuttons">{!cash?<button className="primary" disabled={!can('pos.open')} onClick={()=>setCashModal('open')}><Unlock size={18}/> Abrir caixa</button>:<><button className="secondary" disabled={!cashBelongsToOperator||!can('pos.supply')} onClick={()=>setCashModal('supply')}><ArrowDownToLine size={18}/> Suprimento</button> <button className="secondary" disabled={!cashBelongsToOperator||!can('pos.withdrawal')} onClick={()=>setCashModal('withdrawal')}><ArrowUpFromLine size={18}/> Sangria</button> <button className="primary red" disabled={!cashBelongsToOperator||!can('pos.close')||!!pending||!!cart.length} onClick={()=>{setCloseAmount(cash.summary?.expectedCash||'0');setCashModal('close')}}><Lock size={18}/> Fechar caixa</button></>}</div></div><div className="panel cashinfo"><h3>Resumo do caixa</h3>{[['Abertura',cash?.openingAmount],['Vendas em dinheiro',cash?.summary?.cashSalesAmount],['Suprimentos',cash?.summary?.supplyAmount],['Sangrias',cash?.summary?.withdrawalAmount],['Dinheiro esperado',cash?.summary?.expectedCash]].map(([a,b])=><div className="inforow" key={a}><CheckCircle2 size={17}/><div><strong>{a}</strong><small>{b===undefined?'—':money(b)}</small></div></div>)}</div></div>}
  {page==='historico'&&<section className="panel history"><h2>Últimas vendas registradas</h2><button className="secondary" onClick={()=>void refreshHistory().catch(e=>setError(readError(e)))}><RefreshCw size={17}/> Atualizar</button>{history.length===0?<p>Nenhuma venda encontrada neste terminal.</p>:<div className="historylist">{history.map(s=><div className="historyrow" key={s.id}><strong>Venda #{s.number}</strong><span>{new Date(s.createdAt).toLocaleString('pt-BR')}</span><strong>{money(s.totalAmount)}</strong></div>)}</div>}</section>}</div></main>
  {cashLoginAlert && <div className="overlay cash-login-overlay" role="presentation">
    <div className="modal cash-login-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cash-login-title" aria-describedby="cash-login-message">
      <div className="cash-login-dialog-icon"><Wallet size={28}/></div>
      <h2 id="cash-login-title">{cashLoginAlert === 'closed' ? 'Abra seu caixa para comecar' : 'Caixa aberto por outro usuario'}</h2>
      <p id="cash-login-message">{cashLoginAlert === 'closed'
        ? `${operator.name}, seu login foi realizado, mas voce ainda nao tem um caixa aberto neste terminal (${terminalCode}). Para realizar vendas e movimentacoes, abra o caixa primeiro.`
        : `O terminal ${terminalCode} ja tem um caixa aberto por ${cash?.openedBy?.name || 'outro operador'}. Entre com o usuario responsavel para fechar o caixa atual antes de abrir o seu.`}</p>
      {cashLoginAlert === 'closed' && !can('pos.open') && <p className="cash-login-warning">Seu perfil nao tem permissao para abrir caixa. Solicite acesso ao administrador.</p>}
      <div className="modalbuttons cash-login-actions">
        <button type="button" className="secondary" onClick={()=>void logout()}><LogOut size={16}/> Sair</button>
        {cashLoginAlert === 'closed' ? <button type="button" className="primary" disabled={!can('pos.open')} onClick={()=>{setCashLoginAlert(null);setPage('caixa');setCashModal('open')}}><Unlock size={17}/> Abrir caixa agora</button> :
          <button type="button" className="primary" onClick={()=>void refreshCash().then(current=>{if (!current) setCashLoginAlert('closed');else if (current.openedById === operator.id) {setCashLoginAlert(null);setPage('venda')} else setCashLoginAlert('another-operator')}).catch(e=>setError(readError(e)))}><RefreshCw size={16}/> Verificar novamente</button>}
      </div>
    </div>
  </div>}
  {weightProduct&&<div className="overlay"><div className="modal"><div className="modaltitle"><Scale size={23}/><h3>Venda por peso</h3></div><p>{weightProduct.name}</p><label>Peso em kg</label><input value={weight} autoFocus onChange={e=>setWeight(e.target.value)} placeholder="Ex.: 2,350"/><div className="modalbuttons"><button className="secondary" onClick={()=>setWeightProduct(null)}>Cancelar</button><button className="primary" onClick={saveWeight}>Adicionar ao carrinho</button></div></div></div>}
  {cashModal&&<div className="overlay"><div className="modal"><div className="modaltitle"><Wallet size={23}/><h3>{cashModal==='open'?'Abrir caixa':cashModal==='close'?'Fechar caixa':cashModal==='supply'?'Registrar suprimento':'Registrar sangria'}</h3></div>{cashModal==='open'?<><label>Valor inicial em dinheiro</label><input value={opening} onChange={e=>setOpening(e.target.value)}/></>:cashModal==='close'?<><p>Conte o dinheiro presente na gaveta.</p><label>Dinheiro contado (R$)</label><input value={closeAmount} onChange={e=>setCloseAmount(e.target.value)}/></>:<><label>Valor (R$)</label><input value={movementAmount} onChange={e=>setMovementAmount(e.target.value)}/><label>Motivo</label><input value={movementReason} onChange={e=>setMovementReason(e.target.value)}/></>}<div className="modalbuttons"><button className="secondary" disabled={busy} onClick={()=>setCashModal(null)}>Cancelar</button><button className="primary" disabled={busy} onClick={()=>void cashAction()}>{busy?'Processando...':'Confirmar'}</button></div></div></div>}
  </div>
}
