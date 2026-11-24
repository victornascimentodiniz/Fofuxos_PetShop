
import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import Sidebar from './Sidebar'
import Header from './Header'

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-brand-background">

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div
        className={`
          min-w-0 transition-all duration-300
          ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}
        `}
      >

        <Header
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="mx-auto max-w-[1920px] p-4 md:p-7">
          <Outlet />
        </main>

      </div>
    </div>
  )
}
