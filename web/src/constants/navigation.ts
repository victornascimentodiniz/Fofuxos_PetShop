
import {
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  Package,
  Layers3,
  Grid2X2,
  Tag,
  Warehouse,
  Truck,
  Building2,
  Users,
  Scissors,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  UserRoundCog,
  ClipboardList,
  FolderOpen,
  BadgeDollarSign,
  Shield,
  type LucideIcon,
} from 'lucide-react'

export interface NavigationItem {
  label: string
  path: string
  icon: LucideIcon
  permission: string
}

export interface NavigationGroup {
  title: string
  icon: LucideIcon
  collapsible: boolean
  items: NavigationItem[]
}

// Cada tela aparece somente uma vez.
// As permissoes permanecem as mesmas.
export const navigation: NavigationGroup[] = [
  {
    title: 'INÍCIO',
    icon: LayoutDashboard,
    collapsible: false,
    items: [
      {
        label: 'Visão geral',
        path: '/',
        icon: LayoutDashboard,
        permission: 'dashboard.view',
      },
    ],
  },

  {
    title: 'CADASTROS',
    icon: FolderOpen,
    collapsible: true,
    items: [
      {
        label: 'Produtos',
        path: '/produtos',
        icon: Package,
        permission: 'products.view',
      },
      {
        label: 'Grupos de atendimento',
        path: '/grupos-atendimento',
        icon: Grid2X2,
        permission: 'products.view',
      },
      {
        label: 'Categorias',
        path: '/categorias',
        icon: Layers3,
        permission: 'categories.view',
      },
      {
        label: 'Marcas',
        path: '/marcas',
        icon: Tag,
        permission: 'brands.view',
      },
      {
        label: 'Fornecedores',
        path: '/fornecedores',
        icon: Building2,
        permission: 'suppliers.view',
      },
      {
        label: 'Clientes e pets',
        path: '/clientes',
        icon: Users,
        permission: 'customers.view',
      },
    ],
  },

  {
    title: 'VENDAS E CAIXA',
    icon: ShoppingCart,
    collapsible: true,
    items: [
      {
        label: 'Frente de caixa',
        path: '/caixa',
        icon: ShoppingCart,
        permission: 'pos.access',
      },
      {
        label: 'Controle de caixas',
        path: '/controle-caixas',
        icon: Wallet,
        permission: 'sales.view',
      },
      {
        label: 'Vendas',
        path: '/vendas',
        icon: ReceiptText,
        permission: 'sales.view',
      },
    ],
  },

  {
    title: 'ESTOQUE E COMPRAS',
    icon: Warehouse,
    collapsible: true,
    items: [
      {
        label: 'Estoque',
        path: '/estoque',
        icon: Warehouse,
        permission: 'stock.view',
      },
      {
        label: 'Compras',
        path: '/compras',
        icon: Truck,
        permission: 'purchases.view',
      },
    ],
  },

  {
    title: 'FINANCEIRO',
    icon: BadgeDollarSign,
    collapsible: true,
    items: [
      {
        label: 'Financeiro',
        path: '/financeiro',
        icon: Wallet,
        permission: 'finance.view',
      },
    ],
  },

  {
    title: 'ATENDIMENTOS',
    icon: Scissors,
    collapsible: true,
    items: [
      {
        label: 'Banho e tosa',
        path: '/servicos',
        icon: Scissors,
        permission: 'services.view',
      },
    ],
  },

  {
    title: 'RELATÓRIOS E AUDITORIA',
    icon: ChartNoAxesCombined,
    collapsible: true,
    items: [
      {
        label: 'Relatórios',
        path: '/relatorios',
        icon: ChartNoAxesCombined,
        permission: 'reports.view',
      },
      {
        label: 'Auditoria',
        path: '/auditoria',
        icon: ClipboardList,
        permission: 'audit.view',
      },
    ],
  },

  {
    title: 'ADMINISTRAÇÃO',
    icon: Shield,
    collapsible: true,
    items: [
      {
        label: 'Usuários',
        path: '/usuarios',
        icon: UserRoundCog,
        permission: 'users.view',
      },
      {
        label: 'Perfis de acesso',
        path: '/perfis',
        icon: ShieldCheck,
        permission: 'profiles.view',
      },
      {
        label: 'Configurações',
        path: '/configuracoes',
        icon: Settings,
        permission: 'settings.view',
      },
    ],
  },
]

// Continua compativel com AppRoutes
// e com o redirecionamento apos o login.
export function getDefaultRoute(
  permissions: string[],
): string {
  const firstRoute = navigation
    .flatMap((group) => group.items)
    .find((item) =>
      permissions.includes(item.permission),
    )

  return firstRoute?.path ?? '/sem-acesso'
}
