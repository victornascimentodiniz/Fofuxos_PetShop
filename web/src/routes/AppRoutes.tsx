
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import {
  LoaderCircle,
  ShieldAlert,
} from 'lucide-react'

// ============================================
// PAGINAS
// ============================================

import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Placeholder from '../pages/Placeholder'
import Users from '../pages/Users'
import Profiles from '../pages/Profiles'
import ChangePassword from '../pages/ChangePassword'
import Catalog from '../pages/Catalog'
import Products from '../pages/Products'
import AttendanceGroups from '../pages/AttendanceGroups'
import CustomersPets from '../pages/CustomersPets'
import StoreSettings from '../pages/StoreSettings'
import '../styles/fofuxos-dark.css'
import Stock from '../pages/Stock'
import Suppliers from '../pages/Suppliers'
import CashManagement from '../pages/CashManagement'
import SalesManagement from '../pages/SalesManagement'
import FinancialReports from '../pages/FinancialReports'
import Purchases from '../pages/Purchases'

// ============================================
// LAYOUT E PROTECAO
// ============================================

import AdminLayout from '../components/layout/AdminLayout'

import ProtectedRoute from './ProtectedRoute'

import { useAuth } from '../hooks/useAuth'

import {
  navigation,
  getDefaultRoute,
} from '../constants/navigation'

// ============================================
// ROTA PUBLICA
// ============================================

// Aplica o tema antes de desenhar as paginas.
if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
  document.documentElement.classList.toggle('dark', localStorage.getItem('fofuxos-theme') === 'dark')
}
function PublicRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoaderCircle
          className="animate-spin text-[#AD4679]"
          size={38}
        />
      </div>
    )
  }

  if (user) {
    return (
      <Navigate
        to={
          user.mustChangePassword
            ? '/alterar-senha'
            : getDefaultRoute(user.permissions)
        }
        replace
      />
    )
  }

  return <Login />
}

// ============================================
// PAGINA INICIAL
// ============================================

function HomePage() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.permissions.includes('dashboard.view')) {
    return (
      <Navigate
        to={getDefaultRoute(user.permissions)}
        replace
      />
    )
  }

  return <Dashboard />
}

// ============================================
// USUARIO SEM PERMISSOES
// ============================================

function NoAccess() {
  const { logout } = useAuth()

  async function handleLogout() {
    try {
      await logout()
    } catch {
      window.alert(
        'Não foi possível encerrar a sessão.',
      )
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">

      <ShieldAlert
        size={48}
        className="text-[#AD4679]"
      />

      <h1 className="text-xl font-bold">
        Nenhuma página disponível
      </h1>

      <p className="text-sm text-gray-500">
        Solicite ao administrador a liberação
        das permissões do seu perfil.
      </p>

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="rounded-xl bg-[#AD4679] px-5 py-3 text-white"
      >
        Sair
      </button>

    </div>
  )
}

// ============================================
// ROTAS PRINCIPAIS
// ============================================

export default function AppRoutes() {
  // Rotas que possuem paginas implementadas.
  // Nao devem carregar o Placeholder.

  const implementedRoutes = [
    '/',
    '/usuarios',
    '/perfis',
    '/categorias',
    '/marcas',
    '/produtos',
    '/grupos-atendimento',
    '/clientes',
    '/configuracoes',
    '/estoque',
    '/fornecedores',
    '/controle-caixas',
    '/vendas',
    '/relatorios',
    '/compras',
  ]

  // Modulos ainda em desenvolvimento
  // continuam usando a pagina provisoria.

  const modules = navigation
    .flatMap((group) => group.items)
    .filter(
      (item) =>
        !implementedRoutes.includes(item.path),
    )

  return (
    <BrowserRouter>
      <Routes>

        {/* ====================================
            LOGIN
            ==================================== */}

        <Route
          path="/login"
          element={<PublicRoute />}
        />

        {/* ====================================
            ALTERACAO DE SENHA
            ==================================== */}

        <Route
          element={
            <ProtectedRoute allowPasswordChange />
          }
        >
          <Route
            path="/alterar-senha"
            element={<ChangePassword />}
          />
        </Route>

        {/* ====================================
            ROTAS AUTENTICADAS
            ==================================== */}

        <Route element={<ProtectedRoute />}>

          <Route
            path="/sem-acesso"
            element={<NoAccess />}
          />

          <Route
            path="/"
            element={<AdminLayout />}
          >

            {/* ================================
                DASHBOARD
                ================================ */}

            <Route
              index
              element={<HomePage />}
            />

            {/* ================================
                USUARIOS
                ================================ */}

            <Route
              element={
                <ProtectedRoute
                  permission="users.view"
                />
              }
            >
              <Route
                path="usuarios"
                element={<Users />}
              />
            </Route>

            {/* ================================
                PERFIS DE ACESSO
                ================================ */}

            <Route
              element={
                <ProtectedRoute
                  permission="profiles.view"
                />
              }
            >
              <Route
                path="perfis"
                element={<Profiles />}
              />
            </Route>

            {/* ================================
                CATEGORIAS
                ================================ */}

            <Route
              element={
                <ProtectedRoute
                  permission="categories.view"
                />
              }
            >
              <Route
                path="categorias"
                element={<Catalog />}
              />
            </Route>

            {/* ================================
                MARCAS
                ================================ */}

            <Route
              element={
                <ProtectedRoute
                  permission="brands.view"
                />
              }
            >
              <Route
                path="marcas"
                element={<Catalog />}
              />
            </Route>

            {/* ================================
                PRODUTOS
                ================================ */}

            <Route
              element={
                <ProtectedRoute
                  permission="products.view"
                />
              }
            >
              <Route
                path="produtos"
                element={<Products />}
              />
            </Route>

            <Route element={<ProtectedRoute permission="products.view" />}>
              <Route path="grupos-atendimento" element={<AttendanceGroups />} />
            </Route>

            {/* ================================
                CONTROLE DE ESTOQUE
                ================================ */}

            <Route
              element={
                <ProtectedRoute
                  permission="stock.view"
                />
              }
            >
              <Route
                path="estoque"
                element={<Stock />}
              />
            </Route>

            {/* ================================
                FORNECEDORES
                ================================ */}

            <Route
              element={
                <ProtectedRoute
                  permission="suppliers.view"
                />
              }
            >
              <Route
                path="fornecedores"
                element={<Suppliers />}
              />
            </Route>

            {/* CLIENTES E PETS */}
            <Route element={<ProtectedRoute permission="customers.view" />}>
              <Route path="clientes" element={<CustomersPets />} />
            </Route>
            {/* CONFIGURACOES */}
            <Route element={<ProtectedRoute permission="settings.view" />}>
              <Route path="configuracoes" element={<StoreSettings />} />
            </Route>

            {/* COMPRAS E RECEBIMENTO */}
            <Route element={<ProtectedRoute permission="purchases.view" />}>
              <Route path="compras" element={<Purchases />} />
            </Route>

            {/* CONTROLE GERENCIAL DO PDV */}
            <Route element={<ProtectedRoute permission="sales.view" />}>
              <Route path="controle-caixas" element={<CashManagement />} />
              <Route path="vendas" element={<SalesManagement />} />
              <Route path="relatorios" element={<FinancialReports />} />
            </Route>

            {/* ================================
                MODULOS EM DESENVOLVIMENTO
                ================================ */}

            {modules.map((item) => (
              <Route
                key={item.path}
                element={
                  <ProtectedRoute
                    permission={item.permission}
                  />
                }
              >
                <Route
                  path={item.path.slice(1)}
                  element={
                    <Placeholder
                      title={item.label}
                    />
                  }
                />
              </Route>
            ))}

          </Route>

        </Route>

        {/* ====================================
            ROTAS INEXISTENTES
            ==================================== */}

        <Route
          path="*"
          element={
            <Navigate to="/" replace />
          }
        />

      </Routes>
    </BrowserRouter>
  )
}
