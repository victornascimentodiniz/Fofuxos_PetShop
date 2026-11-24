
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { CatalogService } from './catalog.service';
import { CategoriesController } from './categories.controller';
import { BrandsController } from './brands.controller';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    CategoriesController,
    BrandsController,
  ],

  providers: [
    CatalogService,
  ],

  exports: [
    CatalogService,
  ],
})
export class CatalogModule {}
