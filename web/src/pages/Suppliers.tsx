import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Building2, CheckCircle2, ChevronLeft, ChevronRight, LoaderCircle, Mail, MapPin, Pencil, Phone, Plus, Power, RefreshCw, Search, Truck, X } from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { getApiError } from '../services/management.service'
import { suppliersService } from '../services/suppliers.service'
import SupplierForm from '../components/suppliers/SupplierForm'
import type { Supplier, SupplierPagination, SupplierStatus } from '../types/supplier'
import '../styles/suppliers.css'

const PAGE_SIZE = 20
const EMPTY_PAGINATION: SupplierPagination = { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 }

function documentLabel(document: string | null) {
  if (!document) return 'Documento não informado'
  const d = document.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
  return document
}

export default function Suppliers() {
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('suppliers.create')
  const canUpdate = hasPermission('suppliers.update')
  const canStatus = hasPermission('suppliers.status')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [pagination, setPagination] = useState<SupplierPagination>(EMPTY_PAGINATION)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<SupplierStatus>('all')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<Supplier | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState('')

  const refresh = useCallback(() => setReload(v => v + 1), [])

  useEffect(() => {
    const t = window.setTimeout(() => { setQuery(search.trim()); setPage(1) }, 350)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError('')
      try {
        const response = await suppliersService.list({ search: query || undefined, status, page, limit: PAGE_SIZE })
        if (cancelled) return
        const lastPage = Math.max(1, response.pagination.totalPages)
        if (page > lastPage) { setPage(lastPage); return }
        setSuppliers(response.data)
        setPagination(response.pagination)
      } catch (e) {
        if (!cancelled) { setError(getApiError(e)); setSuppliers([]) }
      } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [query, status, page, reload])

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(t)
  }, [notice])

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(item: Supplier) { setEditing(item); setFormOpen(true) }
  function saved(message: string) { setFormOpen(false); setEditing(null); setNotice(message); refresh() }
  function openStatus(item: Supplier) { setStatusTarget(item); setStatusError('') }
  async function confirmStatus() {
    if (!statusTarget || statusSaving) return
    const nextActive = !statusTarget.active
    setStatusSaving(true); setStatusError('')
    try {
      await suppliersService.updateStatus(statusTarget.id, nextActive)
      setStatusTarget(null)
      setNotice(nextActive ? 'Fornecedor ativado com sucesso!' : 'Fornecedor desativado com sucesso!')
      refresh()
    } catch (e) { setStatusError(getApiError(e)) }
    finally { setStatusSaving(false) }
  }

  return (
    <div className="supplier-page">
      <header className="supplier-page-header">
        <div><span className="supplier-breadcrumb">Cadastros / Fornecedores</span><h1>Fornecedores</h1><p>Cadastre, consulte e mantenha os parceiros comerciais do pet shop.</p></div>
        <div className="supplier-toolbar"><button type="button" className="supplier-btn supplier-btn-secondary" onClick={refresh} disabled={loading}><RefreshCw size={17} className={loading ? 'supplier-spin' : ''}/> Atualizar</button>{canCreate && <button type="button" className="supplier-btn supplier-btn-primary" onClick={openCreate}><Plus size={18}/> Novo fornecedor</button>}</div>
      </header>
      <div className="supplier-summary"><div className="supplier-summary-icon"><Truck size={24}/></div><div><span>Total encontrado</span><strong>{pagination.total}</strong><small>Fornecedores conforme os filtros selecionados</small></div></div>
      {error && <div className="supplier-alert supplier-alert-error" role="alert"><AlertCircle size={19}/>{error}</div>}
      {notice && <div className="supplier-alert supplier-alert-success" role="status"><CheckCircle2 size={19}/>{notice}</div>}
      <section className="supplier-card">
        <div className="supplier-card-title"><div><h2>Fornecedores cadastrados</h2><p>Pesquise pelo nome, documento ou cidade.</p></div></div>
        <div className="supplier-filters">
          <label className="supplier-search"><Search size={19}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome, CPF/CNPJ ou cidade..." aria-label="Pesquisar fornecedores"/></label>
          <select aria-label="Filtrar situação" value={status} onChange={e => { setStatus(e.target.value as SupplierStatus); setPage(1) }}><option value="all">Todas as situações</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select>
          <button type="button" className="supplier-btn supplier-btn-secondary" onClick={() => { setSearch(''); setQuery(''); setStatus('all'); setPage(1) }}><X size={16}/> Limpar</button>
        </div>
        {loading ? <div className="supplier-empty"><LoaderCircle className="supplier-spin" size={30}/><h3>Carregando fornecedores...</h3></div> : error ? <div className="supplier-empty"><AlertCircle size={32}/><h3>Não foi possível carregar os fornecedores.</h3><button className="supplier-btn supplier-btn-secondary" onClick={refresh}>Tentar novamente</button></div> : suppliers.length === 0 ? <div className="supplier-empty"><Building2 size={34}/><h3>Nenhum fornecedor encontrado</h3><p>Cadastre um fornecedor ou ajuste os filtros.</p>{canCreate && <button className="supplier-btn supplier-btn-primary" onClick={openCreate}><Plus size={17}/> Novo fornecedor</button>}</div> : (
          <div className="supplier-table-scroll"><table className="supplier-table"><thead><tr><th>Fornecedor</th><th>Contato</th><th>Localização</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
            {suppliers.map(item => <tr key={item.id}>
              <td><div className="supplier-name"><span className="supplier-avatar"><Building2 size={20}/></span><div><strong>{item.name}</strong>{item.tradeName && <small>{item.tradeName}</small>}<small>{documentLabel(item.document)}</small></div></div></td>
              <td><div className="supplier-details">{item.phone && <span><Phone size={13}/>{item.phone}</span>}{item.email && <span><Mail size={13}/>{item.email}</span>}{!item.phone && !item.email && <span>Não informado</span>}</div></td>
              <td><div className="supplier-details"><span><MapPin size={13}/>{[item.city, item.state].filter(Boolean).join(' / ') || 'Não informado'}</span></div></td>
              <td><span className={`supplier-status ${item.active ? 'supplier-status-active' : 'supplier-status-inactive'}`}>{item.active ? 'Ativo' : 'Inativo'}</span></td>
              <td><div className="supplier-actions">{canUpdate && <button type="button" title="Editar fornecedor" aria-label={`Editar ${item.name}`} onClick={() => openEdit(item)}><Pencil size={17}/></button>}{canStatus && <button type="button" title={item.active ? 'Desativar' : 'Ativar'} aria-label={`${item.active ? 'Desativar' : 'Ativar'} ${item.name}`} onClick={() => openStatus(item)}><Power size={17}/></button>}{!canUpdate && !canStatus && <span>Somente leitura</span>}</div></td>
            </tr>)}
          </tbody></table></div>
        )}
        {!error && <footer className="supplier-pagination"><span>{pagination.total === 0 ? 'Nenhum fornecedor' : `Exibindo ${(pagination.page - 1) * PAGE_SIZE + 1}–${Math.min(pagination.page * PAGE_SIZE, pagination.total)} de ${pagination.total}`}</span><div><button aria-label="Página anterior" disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={19}/></button><strong>{page} de {Math.max(1, pagination.totalPages)}</strong><button aria-label="Próxima página" disabled={loading || page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={19}/></button></div></footer>}
      </section>
      {formOpen && <SupplierForm supplier={editing} onClose={() => { setFormOpen(false); setEditing(null) }} onSaved={saved}/>}
      {statusTarget && <div className="supplier-overlay"><section className="supplier-confirm" role="dialog" aria-modal="true" aria-labelledby="supplier-status-heading"><div className="supplier-confirm-icon"><Power size={25}/></div><h2 id="supplier-status-heading">{statusTarget.active ? 'Desativar fornecedor?' : 'Ativar fornecedor?'}</h2><p>Deseja realmente {statusTarget.active ? 'desativar' : 'ativar'} <strong>{statusTarget.name}</strong>?</p><small>O histórico e os pedidos de compra serão preservados.</small>{statusError && <div className="supplier-alert supplier-alert-error" role="alert"><AlertCircle size={18}/>{statusError}</div>}<div className="supplier-confirm-actions"><button className="supplier-btn supplier-btn-secondary" type="button" disabled={statusSaving} onClick={() => setStatusTarget(null)}>Cancelar</button><button className="supplier-btn supplier-btn-primary" type="button" disabled={statusSaving} onClick={() => void confirmStatus()}>{statusSaving ? <LoaderCircle size={17} className="supplier-spin"/> : <CheckCircle2 size={17}/>} Confirmar</button></div></section></div>}
    </div>
  )
}
