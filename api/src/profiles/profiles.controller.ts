
import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ProfilesService } from './profiles.service';

import {
  CreateProfileDto,
} from './dto/create-profile.dto';

import {
  UpdateProfileDto,
} from './dto/update-profile.dto';

import {
  UpdateProfilePermissionsDto,
} from './dto/update-profile-permissions.dto';

import {
  UpdateProfileStatusDto,
} from './dto/update-profile-status.dto';

import {
  AuthGuard,
} from '../auth/guards/auth.guard';

import {
  PermissionsGuard,
} from '../auth/guards/permissions.guard';

import {
  RequirePermissions,
} from '../auth/decorators/permissions.decorator';

import type {
  AuthenticatedRequest,
} from '../auth/auth.types';

@Controller('profiles')
@UseGuards(AuthGuard, PermissionsGuard)
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
  ) {}

  @Get()
  @RequirePermissions('profiles.view')
  findAll() {
    return this.profilesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('profiles.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.profilesService.findOne(id);
  }

  @Post()
  @RequirePermissions('profiles.create')
  create(
    @Body() dto: CreateProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.profilesService.create(
      dto,
      request.user,
    );
  }

  @Patch(':id')
  @RequirePermissions('profiles.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.profilesService.update(
      id,
      dto,
      request.user,
    );
  }

  @Put(':id/permissions')
  @RequirePermissions('profiles.permissions')
  updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfilePermissionsDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.profilesService.updatePermissions(
      id,
      dto.permissionCodes,
      request.user,
    );
  }

  @Patch(':id/status')
  @RequirePermissions('profiles.status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.profilesService.updateStatus(
      id,
      dto.active,
      request.user,
    );
  }
}
