
import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import {
  PermissionsService,
} from './permissions.service';

import {
  AuthGuard,
} from '../auth/guards/auth.guard';

import {
  PermissionsGuard,
} from '../auth/guards/permissions.guard';

import {
  RequirePermissions,
} from '../auth/decorators/permissions.decorator';

@Controller('permissions')
@UseGuards(AuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(
    private readonly permissionsService:
      PermissionsService,
  ) {}

  @Get()
  @RequirePermissions('profiles.view')
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get('grouped')
  @RequirePermissions('profiles.view')
  findGrouped() {
    return this.permissionsService.findGrouped();
  }
}
