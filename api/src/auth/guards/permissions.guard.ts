
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import type {
  AuthenticatedRequest,
} from '../auth.types';

import type {
  PermissionCode,
} from '../../permissions/permissions.catalog';

import {
  PERMISSIONS_KEY,
} from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException(
        'É necessário realizar o login.',
      );
    }

    if (
      !request.user.active ||
      !request.user.profile?.active
    ) {
      throw new ForbiddenException(
        'Usuário ou perfil de acesso inativo.',
      );
    }

    const requiredPermissions =
      this.reflector.getAllAndMerge<
        PermissionCode[]
      >(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requiredPermissions?.length) {
      throw new ForbiddenException(
        'Operação sem permissão configurada.',
      );
    }

    const userPermissions = new Set(
      request.user.permissions,
    );

    const missingPermissions =
      requiredPermissions.filter(
        (permission) =>
          !userPermissions.has(permission),
      );

    if (missingPermissions.length > 0) {
      throw new ForbiddenException(
        'Você não possui permissão para realizar esta operação.',
      );
    }

    return true;
  }
}
