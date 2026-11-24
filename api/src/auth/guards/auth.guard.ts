
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

import { AuthService } from '../auth.service';

import {
  AUTH_COOKIE_NAME,
} from '../auth.constants';

import type {
  AuthenticatedRequest,
} from '../auth.types';

@Injectable()
export class AuthGuard
  implements CanActivate
{
  constructor(
    private readonly authService: AuthService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const token: unknown =
      request.cookies?.[AUTH_COOKIE_NAME];

    if (typeof token !== 'string') {
      throw new UnauthorizedException(
        'É necessário realizar o login.',
      );
    }

    const user =
      await this.authService.validateSession(
        token,
      );

    request.user = user;

    if (user.mustChangePassword) {
      const allowedRoutes = [
        'me',
        'logout',
        'changePassword',
      ];

      const handlerName =
        context.getHandler().name;

      if (!allowedRoutes.includes(handlerName)) {
        throw new ForbiddenException(
          'Altere sua senha temporária antes de continuar.',
        );
      }
    }

    return true;
  }
}
