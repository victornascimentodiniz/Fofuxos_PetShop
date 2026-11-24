import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Check, LoaderCircle, X } from 'lucide-react'
import { suppliersService } from '../../services/suppliers.service'
import { getApiError } from '../../services/management.service'
import type { Supplier, SupplierInput } from '../../types/supplier'

interface Props {
  supplier: Supplier | null
  onClose: () => void
  onSaved: (message: string) => void
}

const empty: SupplierInput = {
  name: '', tradeName: null, document: null, stateRegistration: null,
  email: null, phone: null, contactName: null, zipCode: null,
  street: null, addressNumber: null, complement: null,
  neighborhood: null, city: null, state: null, observations: null,
}

type Field = keyof SupplierInput
function toInput(supplier: Supplier | null): SupplierInput {
  if (!supplier) return { ...empty }
  return {
    name: supplier.name, tradeName: supplier.tradeName, document: supplier.document,
    stateRegistration: supplier.stateRegistration, email: supplier.email,
    phone: supplier.phone, contactName: supplier.contactName, zipCode: supplier.zipCode,
    street: supplier.street, addressNumber: supplier.addressNumber,
    complement: supplier.complement, neighborhood: supplier.neighborhood,
    city: supplier.city, state: supplier.state, observations: supplier.observations,
  }
}

export default function SupplierForm({ supplier, onClose, onSaved }: Props) {
  const [form, setForm] = useState<SupplierInput>(() => toInput(supplier))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = before }
  }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saving, onClose])

  function set(field: Field, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  function field(label: string, key: Field, opts: { required?: boolean; max?: number; placeholder?: string; type?: string } = {}) {
    return (
      <label className="supplier-field" key={key}>
        <span>{label}{opts.required && ' *'}</span>
        <input
          type={opts.type ?? 'text'}
          value={form[key] ?? ''}
          onChange={e => set(key, e.target.value)}
          maxLength={opts.max}
          required={opts.required}
          placeholder={opts.placeholder}
          disabled={saving}
          autoComplete="off"
        />
      </label>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    const name = form.name.trim()
    if (name.length < 2) { setError('Informe o nome do fornecedor com pelo menos 2 caracteres.'); return }
    const documentDigits = (form.document ?? '').replace(/\D/g, '')
    if (documentDigits && ![11, 14].includes(documentDigits.length)) {
      setError('O CPF deve ter 11 dígitos ou o CNPJ 14 dígitos.'); return
    }
    const zipDigits = (form.zipCode ?? '').replace(/\D/g, '')
    if (zipDigits && zipDigits.length !== 8) { setError('O CEP deve conter 8 dígitos.'); return }
    const state = (form.state ?? '').trim()
    if (state && !/^[A-Za-z]{2}$/.test(state)) { setError('Informe a UF com 2 letras.'); return }
    // Campos opcionais vazios são enviados como null para possibilitar limpar dados antigos.
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [
      k, typeof v === 'string' ? (v.trim() || null) : v,
    ])) as unknown as SupplierInput
    payload.name = name
    payload.document = documentDigits || null
    payload.zipCode = zipDigits || null
    payload.state = state.toUpperCase() || null
    setSaving(true); setError('')
    try {
      if (supplier) {
        await suppliersService.update(supplier.id, payload)
      } else {
        await suppliersService.create(payload)
      }
      onSaved(supplier ? 'Fornecedor atualizado com sucesso!' : 'Fornecedor cadastrado com sucesso!')
    } catch (err) { setError(getApiError(err)) }
    finally { setSaving(false) }
  }

  return createPortal(
    <div className="supplier-overlay">
      <section className="supplier-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-form-title">
        <header className="supplier-modal-header">
          <div><h2 id="supplier-form-title">{supplier ? 'Editar fornecedor' : 'Novo fornecedor'}</h2><p>Preencha os dados para manter o cadastro atualizado.</p></div>
          <button type="button" className="supplier-icon-btn" aria-label="Fechar" disabled={saving} onClick={onClose}><X size={20}/></button>
        </header>
        <form onSubmit={e => void submit(e)} className="supplier-modal-form">
          <div className="supplier-modal-body">
            {error && <div className="supplier-alert supplier-alert-error" role="alert"><AlertCircle size={18}/>{error}</div>}
            <h3>Identificação</h3>
            <div className="supplier-form-grid">
              {field('Razão social / Nome', 'name', { required: true, max: 150 })}
              {field('Nome fantasia', 'tradeName', { max: 150 })}
              {field('CPF / CNPJ', 'document', { max: 18, placeholder: 'Somente números ou com pontuação' })}
              {field('Inscrição estadual', 'stateRegistration', { max: 30 })}
            </div>
            <h3>Contato</h3>
            <div className="supplier-form-grid">
              {field('E-mail', 'email', { type: 'email', max: 150 })}
              {field('Telefone / WhatsApp', 'phone', { max: 30 })}
              {field('Pessoa de contato', 'contactName', { max: 120 })}
            </div>
            <h3>Endereço</h3>
            <div className="supplier-form-grid">
              {field('CEP', 'zipCode', { max: 9, placeholder: '00000-000' })}
              {field('Logradouro', 'street', { max: 150 })}
              {field('Número', 'addressNumber', { max: 20 })}
              {field('Complemento', 'complement', { max: 100 })}
              {field('Bairro', 'neighborhood', { max: 100 })}
              {field('Cidade', 'city', { max: 100 })}
              {field('UF', 'state', { max: 2, placeholder: 'MG' })}
            </div>
            <label className="supplier-field supplier-notes"><span>Observações</span><textarea rows={3} maxLength={5000} disabled={saving} value={form.observations ?? ''} onChange={e => set('observations', e.target.value)}/></label>
          </div>
          <footer className="supplier-modal-footer"><small>* Campos obrigatórios</small><div><button className="supplier-btn supplier-btn-secondary" type="button" onClick={onClose} disabled={saving}>Cancelar</button><button className="supplier-btn supplier-btn-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="supplier-spin" size={17}/> : <Check size={17}/>} {saving ? 'Salvando...' : 'Salvar fornecedor'}</button></div></footer>
        </form>
      </section>
    </div>, document.body)
}
