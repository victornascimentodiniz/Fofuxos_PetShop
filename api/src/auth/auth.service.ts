
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  randomBytes,
  createHash,
} from 'node:crypto';

import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';

import { LoginDto } from './dto/login.dto';

import {
  SESSION_DURATION_MS,
} from './auth.constants';

import {
  AUTH_USER_SELECT,
  type AuthUserData,
} from './auth.select';

import type {
  AuthenticatedUser,
} from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  private formatUser(
    user: AuthUserData,
  ): AuthenticatedUser {
    if (!user.active) {
      throw new UnauthorizedException(
        'Usuário inativo.',
      );
    }

    if (!user.profileId || !user.profile) {
      throw new UnauthorizedException(
        'Usuário sem perfil de acesso.',
      );
    }

    if (!user.profile.active) {
      throw new UnauthorizedException(
        'Perfil de acesso inativo.',
      );
    }

    const permissions =
      user.profile.permissions.map(
        (item) => item.permission.code,
      );

    return {
      id: user.id,
      name: user.name,
      username: user.username,

      // Compatibilidade temporária.
      role: user.role,

      active: user.active,

      mustChangePassword:
        user.mustChangePassword,

      profileId: user.profileId,

      profile: {
        id: user.profile.id,
        code: user.profile.code,
        name: user.profile.name,
        active: user.profile.active,
        isSystem: user.profile.isSystem,
      },

      permissions,
    };
  }

  /** Apenas nomes e logins dos operadores autorizados; nunca expor dados sensíveis. */
  async listPosOperators() {
    return this.prisma.user.findMany({
      where: {
        active: true,
        mustChangePassword: false,
        profile: {
          is: {
            active: true,
            permissions: {
              some: { permission: { code: 'pos.access' } },
            },
          },
        },
      },
      select: { name: true, username: true },
      orderBy: [{ name: 'asc' }, { username: 'asc' }],
      take: 250,
    });
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const username = dto.username
      .trim()
      .toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { username },

      select: {
        ...AUTH_USER_SELECT,
        passwordHash: true,
      },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException(
        'Usuário ou senha inválidos.',
      );
    }

    const validPassword = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!validPassword) {
      throw new UnauthorizedException(
        'Usuário ou senha inválidos.',
      );
    }

    if (
      !user.profileId ||
      !user.profile ||
      !user.profile.active
    ) {
      throw new UnauthorizedException(
        'Usuário sem perfil de acesso ativo.',
      );
    }

    const token = randomBytes(32)
      .toString('hex');

    const tokenHash = this.hashToken(token);

    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_MS,
    );

    const authenticatedUser =
      await this.prisma.$transaction(
        async (tx) => {
          const result =
            await tx.user.updateMany({
              where: {
                id: user.id,
                active: true,
                passwordHash: user.passwordHash,
                profileId: user.profileId,
              },

              data: {
                lastLoginAt: new Date(),
              },
            });

          if (result.count !== 1) {
            throw new UnauthorizedException(
              'Cadastro alterado. Realize o login novamente.',
            );
          }

          const currentUser =
            await tx.user.findUnique({
              where: {
                id: user.id,
              },

              select: AUTH_USER_SELECT,
            });

          if (!currentUser) {
            throw new UnauthorizedException(
              'Usuário não encontrado.',
            );
          }

          const userData =
            this.formatUser(currentUser);

          await tx.authSession.create({
            data: {
              userId: user.id,
              tokenHash,
              expiresAt,
              ipAddress,
              userAgent,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: user.id,
              action: 'LOGIN_SUCCESS',
              description:
                'Usuário autenticado no sistema.',
              ipAddress,
            },
          });

          return userData;
        },
      );

    return {
      token,
      expiresAt,

      user: authenticatedUser,
    };
  }

  async validateSession(
    token: string,
  ): Promise<AuthenticatedUser> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      throw new UnauthorizedException(
        'Sessão inválida.',
      );
    }

    const tokenHash = this.hashToken(token);

    const session =
      await this.prisma.authSession.findUnique({
        where: {
          tokenHash,
        },

        include: {
          user: {
            select: AUTH_USER_SELECT,
          },
        },
      });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException(
        'Sessão inválida ou expirada.',
      );
    }

    return this.formatUser(session.user);
  }

  async logout(token: string) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return;
    }

    const tokenHash = this.hashToken(token);

    await this.prisma.$transaction(
      async (tx) => {
        const session =
          await tx.authSession.findUnique({
            where: {
              tokenHash,
            },
          });

        if (!session || session.revokedAt) {
          return;
        }

        const result =
          await tx.authSession.updateMany({
            where: {
              id: session.id,
              revokedAt: null,
            },

            data: {
              revokedAt: new Date(),
            },
          });

        if (result.count > 0) {
          await tx.auditLog.create({
            data: {
              userId: session.userId,
              action: 'LOGOUT',
              description:
                'Usuário encerrou sua sessão.',
            },
          });
        }
      },
    );
  }
}
