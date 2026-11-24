
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// ============================================
// BANCO DE DADOS
// ============================================

import { PrismaModule } from './prisma/prisma.module';

// ============================================
// AUTENTICACAO
// ============================================

import { AuthModule } from './auth/auth.module';

// ============================================
// ADMINISTRACAO
// ============================================

import { PermissionsModule } from './permissions/permissions.module';
import { ProfilesModule } from './profiles/profiles.module';
import { UsersModule } from './users/users.module';

// ============================================
// CADASTROS
// ============================================

import { CatalogModule } from './catalog/catalog.module';
import { ProductsModule } from './products/products.module';

// ============================================
// FRACIONAMENTO DE PRODUTOS
// ============================================

import { ProductConversionsModule } from './product-conversions/product-conversions.module';

// ============================================
// CONTROLE DE ESTOQUE
// ============================================

import { StockModule } from './stock/stock.module';

// ============================================
// FORNECEDORES
// ============================================

import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ReportsModule } from './management-reports/reports.module';

// ============================================
// PDV - CAIXA E VENDAS
// ============================================

import { PosModule } from './pos/pos.module';
import { AttendanceGroupsModule } from './attendance-groups/attendance-groups.module';
import { CustomersModule } from './customers/customers.module';
import { StoreSettingsModule } from './store-settings/store-settings.module';

// ============================================
// MODULO PRINCIPAL
// ============================================

@Module({
  imports: [
    // CONFIGURACOES
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // BANCO DE DADOS
    PrismaModule,

    // AUTENTICACAO
    AuthModule,

    // ADMINISTRACAO
    PermissionsModule,
    ProfilesModule,
    UsersModule,

    // CADASTROS
    CatalogModule,
    ProductsModule,

    // FRACIONAMENTO DE PRODUTOS
    ProductConversionsModule,

    // CONTROLE DE ESTOQUE
    StockModule,

    // FORNECEDORES
    SuppliersModule,
    PurchasesModule,
    ReportsModule,

    // PDV - CAIXA E VENDAS
    PosModule,
    AttendanceGroupsModule,
    CustomersModule,
    StoreSettingsModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}
