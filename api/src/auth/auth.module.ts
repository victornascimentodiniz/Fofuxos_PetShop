
import { Module } from '@nestjs/common';

import { ThrottlerModule } from '@nestjs/throttler';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';

import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 5,
      },
    ]),
  ],

  controllers: [
    AuthController,
    PasswordController,
  ],

  providers: [
    AuthService,
    PasswordService,
    AuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],

  exports: [
    AuthService,
    AuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
