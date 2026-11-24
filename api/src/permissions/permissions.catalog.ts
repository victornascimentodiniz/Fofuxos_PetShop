
export const PERMISSION_CATALOG = {
  dashboard: {
    label: 'Visão geral',
    permissions: {
      view: 'Visualizar dashboard',
      financial: 'Visualizar indicadores financeiros',
    },
  },

  pos: {
    label: 'Frente de caixa',
    permissions: {
      access: 'Acessar frente de caixa',
      open: 'Abrir caixa',
      close: 'Fechar caixa',
      sell: 'Realizar vendas',
      cancel: 'Cancelar vendas no caixa',
      discount: 'Conceder descontos',
      withdrawal: 'Realizar sangria',
      supply: 'Realizar suprimento',
    },
  },

  sales: {
    label: 'Vendas',
    permissions: {
      view: 'Consultar vendas',
      cancel: 'Cancelar vendas realizadas',
      receipt: 'Reimprimir comprovantes',
      return: 'Registrar devoluções',
    },
  },

  products: {
    label: 'Produtos',
    permissions: {
      view: 'Consultar produtos',
      create: 'Cadastrar produtos',
      update: 'Editar produtos',
      status: 'Ativar e desativar produtos',
      cost: 'Visualizar preço de custo',
      price: 'Alterar preço de venda',
      conversion: 'Configurar fracionamento de produtos',
    },
  },

  categories: {
    label: 'Categorias',
    permissions: {
      view: 'Consultar categorias',
      create: 'Cadastrar categorias',
      update: 'Editar categorias',
      status: 'Ativar e desativar categorias',
    },
  },

  brands: {
    label: 'Marcas',
    permissions: {
      view: 'Consultar marcas',
      create: 'Cadastrar marcas',
      update: 'Editar marcas',
      status: 'Ativar e desativar marcas',
    },
  },

  stock: {
    label: 'Estoque',
    permissions: {
      view: 'Consultar estoque',
      entry: 'Registrar entradas',
      exit: 'Registrar saídas',
      adjust: 'Realizar ajustes',
      inventory: 'Realizar inventário',
      history: 'Consultar movimentações',
      fraction: 'Realizar fracionamento de produtos',
    },
  },

  purchases: {
    label: 'Compras',
    permissions: {
      view: 'Consultar compras',
      create: 'Registrar compras',
      update: 'Editar compras',
      cancel: 'Cancelar compras',
      receive: 'Receber mercadorias',
    },
  },

  suppliers: {
    label: 'Fornecedores',
    permissions: {
      view: 'Consultar fornecedores',
      create: 'Cadastrar fornecedores',
      update: 'Editar fornecedores',
      status: 'Ativar e desativar fornecedores',
    },
  },

  customers: {
    label: 'Clientes',
    permissions: {
      view: 'Consultar clientes',
      create: 'Cadastrar clientes',
      update: 'Editar clientes',
      status: 'Ativar e desativar clientes',
    },
  },

  pets: {
    label: 'Pets',
    permissions: {
      view: 'Consultar pets',
      create: 'Cadastrar pets',
      update: 'Editar pets',
      status: 'Ativar e desativar pets',
    },
  },

  services: {
    label: 'Banho e tosa',
    permissions: {
      view: 'Consultar agenda',
      create: 'Cadastrar agendamentos',
      update: 'Editar agendamentos',
      cancel: 'Cancelar agendamentos',
      finish: 'Finalizar atendimentos',
      manage: 'Gerenciar serviços e preços',
    },
  },

  finance: {
    label: 'Financeiro',
    permissions: {
      view: 'Acessar módulo financeiro',
      payable: 'Consultar contas a pagar',
      receivable: 'Consultar contas a receber',
      income: 'Cadastrar receitas',
      expense: 'Cadastrar despesas',
      update: 'Editar lançamentos financeiros',
      settlement: 'Realizar baixas',
      reverse: 'Estornar lançamentos',
    },
  },

  reports: {
    label: 'Relatórios',
    permissions: {
      view: 'Acessar módulo de relatórios',
      sales: 'Consultar relatórios de vendas',
      stock: 'Consultar relatórios de estoque',
      finance: 'Consultar relatórios financeiros',
      cash: 'Consultar relatórios de caixa',
      export: 'Exportar relatórios',
    },
  },

  users: {
    label: 'Usuários',
    permissions: {
      view: 'Consultar usuários',
      create: 'Cadastrar usuários',
      update: 'Editar usuários',
      status: 'Ativar e desativar usuários',
      reset_password: 'Redefinir senhas',
      assign_profile: 'Vincular perfis de acesso',
    },
  },

  profiles: {
    label: 'Perfis de acesso',
    permissions: {
      view: 'Consultar perfis',
      create: 'Cadastrar perfis',
      update: 'Editar perfis',
      permissions: 'Alterar permissões dos perfis',
      status: 'Ativar e desativar perfis',
    },
  },

  audit: {
    label: 'Auditoria',
    permissions: {
      view: 'Consultar registros de auditoria',
      export: 'Exportar registros de auditoria',
    },
  },

  settings: {
    label: 'Configurações',
    permissions: {
      view: 'Consultar configurações',
      update: 'Alterar configurações da loja',
      company: 'Alterar dados da empresa',
      system: 'Alterar configurações do sistema',
    },
  },

  backup: {
    label: 'Backup',
    permissions: {
      view: 'Consultar backups',
      create: 'Realizar backup',
      restore: 'Restaurar backup',
    },
  },
} as const;

// ============================================
// TIPAGEM DAS PERMISSOES
// ============================================

export type PermissionCatalog =
  typeof PERMISSION_CATALOG;

export type PermissionModule =
  keyof PermissionCatalog;

export type PermissionCode = {
  [Module in PermissionModule]:
    `${Module}.${Extract<
      keyof PermissionCatalog[Module]['permissions'],
      string
    >}`;
}[PermissionModule];

// ============================================
// DEFINICAO DAS PERMISSOES
// ============================================

export interface PermissionDefinition {
  code: PermissionCode;
  name: string;
  module: string;
}

// ============================================
// LISTA COMPLETA DE PERMISSOES
// ============================================

export const PERMISSIONS: PermissionDefinition[] =
  Object.entries(PERMISSION_CATALOG).flatMap(
    ([moduleCode, moduleData]) =>
      Object.entries(moduleData.permissions).map(
        ([actionCode, actionName]) => ({
          code: `${moduleCode}.${actionCode}` as PermissionCode,
          name: actionName,
          module: moduleData.label,
        }),
      ),
  );
