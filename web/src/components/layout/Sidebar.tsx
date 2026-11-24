import { useEffect, useMemo, useState } from 'react'
import {
  PawPrint, PanelLeftClose, PanelLeftOpen, Monitor,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { navigation } from '../../constants/navigation'
import { useAuth } from '../../hooks/useAuth'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onClose: () => void
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onClose }: SidebarProps) {
  const { user } = useAuth()
  const location = useLocation()
  const userPermissions = user?.permissions ?? []
  const visibleNavigation = useMemo(() => navigation
    .map(group => ({ ...group, items: group.items.filter(item => userPermissions.includes(item.permission)) }))
    .filter(group => group.items.length > 0), [userPermissions.join('|')])

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Mantém aberta a cascata da página atual, inclusive após recarregar a tela.
  useEffect(() => {
    const activeGroup = visibleNavigation.find(group => group.collapsible && group.items.some(
      item => location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(`${item.path}/`))
    ))
    if (activeGroup) setExpanded(prev => ({ ...prev, [activeGroup.title]: true }))
  }, [location.pathname, visibleNavigation])

  function toggleGroup(title: string) {
    if (collapsed && !mobileOpen) onToggle()
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <>
      {mobileOpen && (
        <button type="button" aria-label="Fechar menu" onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
      )}
      <aside className={`fixed left-0 top-0 z-50 flex h-dvh flex-col bg-brand-dark text-white transition-all duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 w-64 ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-secondary/15">
              <PawPrint size={26} className="text-brand-secondary" />
            </div>
            <div className={collapsed ? 'lg:hidden' : ''}>
              <h1 className="text-xl font-bold text-[#E6A1C2]">Fofuxos</h1>
              <p className="text-[10px] font-semibold tracking-[0.25em] text-brand-secondary">GESTÃO</p>
            </div>
          </div>
          {!collapsed && <button type="button" onClick={onToggle} className="hidden rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white lg:block" aria-label="Recolher menu"><PanelLeftClose size={19}/></button>}
        </div>
        {collapsed && <button type="button" onClick={onToggle} className="mx-auto mt-3 hidden rounded-lg p-3 text-gray-400 hover:bg-white/10 lg:block" aria-label="Expandir menu"><PanelLeftOpen size={20}/></button>}
        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Menu principal">
          {visibleNavigation.map(group => {
            const GroupIcon = group.icon
            const hasActiveItem = group.items.some(item => location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(`${item.path}/`)))
            const isOpen = !!expanded[group.title]
            return (
              <div key={group.title} className="mb-2">
                {group.collapsible && (
                  <button type="button" onClick={() => toggleGroup(group.title)}
                    aria-expanded={isOpen} aria-label={`${isOpen ? 'Recolher' : 'Expandir'} ${group.title.toLowerCase()}`}
                    title={group.title}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors ${hasActiveItem ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'} ${collapsed ? 'lg:justify-center' : ''}`}>
                    <GroupIcon size={20} className="shrink-0 text-brand-secondary"/>
                    <span className={`flex-1 ${collapsed ? 'lg:hidden' : ''}`}>{group.title.charAt(0) + group.title.slice(1).toLocaleLowerCase('pt-BR')}</span>
                    <span className={collapsed ? 'lg:hidden' : ''}>{isOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</span>
                  </button>
                )}
                {(!group.collapsible || isOpen) && (
                  <div className={group.collapsible ? `mt-1 space-y-1 border-l border-white/10 pl-2 ${collapsed ? 'lg:border-l-0 lg:pl-0' : 'ml-5'}` : 'space-y-1'}>
                    {group.items.map(item => {
                      const Icon = item.icon
                      return <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={onClose} title={item.label} aria-label={item.label}
                        className={({isActive}) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${collapsed ? 'lg:justify-center' : ''} ${isActive ? 'bg-brand-primary text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
                        <Icon size={19} className="shrink-0"/>
                        <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                      </NavLink>
                    })}
                  </div>
                )}
              </div>
            )
          })}
          {visibleNavigation.length === 0 && <p className={`rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-gray-300 ${collapsed ? 'lg:hidden' : ''}`}>Nenhum módulo disponível para o seu perfil.</p>}
        </nav>
        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <Monitor size={22} className="shrink-0 text-brand-secondary"/>
            <div className={collapsed ? 'lg:hidden' : ''}>
              <p className="text-xs font-medium text-gray-200">Ambiente local</p>
              <p className="mt-1 text-[10px] text-gray-400">Versão 0.1.0</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
