
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { AuthGuard } from '../auth/guards/auth.guard';

import {
  PermissionsGuard,
} from '../auth/guards/permissions.guard';

import {
  RequirePermissions,
} from '../auth/decorators/permissions.decorator';

import type {
  AuthenticatedRequest,
} from '../auth/auth.types';

@Controller('users')
@UseGuards(AuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @RequirePermissions('users.view')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('available-profiles')
  @RequirePermissions('users.assign_profile')
  availableProfiles(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.availableProfiles(
      request.user,
    );
  }

  @Get(':id')
  @RequirePermissions('users.view')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions(
    'users.create',
    'users.assign_profile',
  )
  create(
    @Body() dto: CreateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.create(
      dto,
      request.user,
    );
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.update(
      id,
      dto,
      request.user,
    );
  }

  @Patch(':id/status')
  @RequirePermissions('users.status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.updateStatus(
      id,
      dto.active,
      request.user,
    );
  }

  @Post(':id/reset-password')
  @RequirePermissions('users.reset_password')
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.resetPassword(
      id,
      dto.password,
      request.user,
    );
  }
}
