
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';

import type { Prisma } from '../generated/prisma/client';

import { UserRole } from '../generated/prisma/enums';

import type {
  AuthenticatedUser,
} from '../auth/auth.types';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { USER_SELECT } from './users.constants';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private hashPassword(password: string) {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  }

  private handleError(error: unknown): never {
    const code =
      (error as { code?: string } | null)?.code;

    if (code === 'P2002') {
      throw new ConflictException(
        'Este nome de usuário já está em uso.',
      );
    }

    if (code === 'P2034') {
      throw new ConflictException(
        'Outra alteração está em andamento. Tente novamente.',
      );
    }

    throw error;
  }

  private async getActor(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedUser,
    requiredPermissions: string[],
  ) {
    const currentActor = await tx.user.findUnique({
      where: { id: actor.id },

      include: {
        profile: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (
      !currentActor?.active ||
      currentActor.mustChangePassword ||
      !currentActor.profile?.active
    ) {
      throw new ForbiddenException(
        'Seu acesso não está autorizado.',
      );
    }

    const permissions = new Set(
      currentActor.profile.permissions.map(
        (item) => item.permission.code,
      ),
    );

    if (
      requiredPermissions.some(
        (code) => !permissions.has(code),
      )
    ) {
      throw new ForbiddenException(
        'Você não possui permissão para esta operação.',
      );
    }

    return {
      id: currentActor.id,

      isSystem:
        currentActor.profile.isSystem,

      permissions,
    };
  }

  private async getProfile(
    tx: Prisma.TransactionClient,
    profileId: string,
  ) {
    const profile = await tx.profile.findUnique({
      where: {
        id: profileId,
      },

      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(
        'Perfil de acesso não encontrado.',
      );
    }

    return profile;
  }

  private async ensureCanManageProfile(
    tx: Prisma.TransactionClient,
    profileId: string,
    actor: {
      isSystem: boolean;
      permissions: Set<string>;
    },
    requireActive = true,
  ) {
    const profile = await this.getProfile(
      tx,
      profileId,
    );

    if (requireActive && !profile.active) {
      throw new BadRequestException(
        'O perfil selecionado está inativo.',
      );
    }

    if (profile.isSystem && !actor.isSystem) {
      throw new ForbiddenException(
        'Você não pode administrar o perfil protegido.',
      );
    }

    const unauthorized = profile.permissions.some(
      (item) =>
        !actor.permissions.has(
          item.permission.code,
        ),
    );

    if (unauthorized) {
      throw new ForbiddenException(
        'Você não pode administrar usuários com permissões superiores às suas.',
      );
    }

    return profile;
  }

  private legacyRole(profile: {
    code: string;
    isSystem: boolean;
  }) {
    if (profile.isSystem) {
      return UserRole.ADMIN;
    }

    if (profile.code === 'MANAGER') {
      return UserRole.MANAGER;
    }

    return UserRole.OPERATOR;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: USER_SELECT,

      orderBy: [
        { active: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException(
        'Usuário não encontrado.',
      );
    }

    return user;
  }

  async availableProfiles(actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const currentActor = await this.getActor(
        tx,
        actor,
        ['users.assign_profile'],
      );

      const profiles = await tx.profile.findMany({
        where: { active: true },

        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },

        orderBy: { name: 'asc' },
      });

      return profiles
        .filter((profile) =>
          (!profile.isSystem || currentActor.isSystem) &&
          profile.permissions.every((item) =>
            currentActor.permissions.has(
              item.permission.code,
            ),
          ),
        )
        .map((profile) => ({
          id: profile.id,
          name: profile.name,
          code: profile.code,
          active: profile.active,
          isSystem: profile.isSystem,
          permissions: profile.permissions.map(
            (item) => item.permission,
          ),
        }));
    });
  }

  async create(
    dto: CreateUserDto,
    actor: AuthenticatedUser,
  ) {
    const passwordHash = await this.hashPassword(
      dto.password,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const currentActor = await this.getActor(
            tx,
            actor,
            [
              'users.create',
              'users.assign_profile',
            ],
          );

          const profile =
            await this.ensureCanManageProfile(
              tx,
              dto.profileId,
              currentActor,
            );

          const user = await tx.user.create({
            data: {
              name: dto.name.trim(),

              username:
                dto.username.trim().toLowerCase(),

              passwordHash,

              profileId: profile.id,

              role: this.legacyRole(profile),

              active: true,

              mustChangePassword: true,
            },

            select: USER_SELECT,
          });

          await tx.auditLog.create({
            data: {
              userId: actor.id,
              action: 'USER_CREATED',
              description:
                `Usuário ${user.username} cadastrado no perfil ${profile.name}.`,
              entity: 'User',
              entityId: user.id,
            },
          });

          return user;
        },

        {
          isolationLevel: 'Serializable',
        },
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const currentActor = await this.getActor(
            tx,
            actor,
            ['users.update'],
          );

          const user = await tx.user.findUnique({
            where: { id },
          });

          if (!user || !user.profileId) {
            throw new NotFoundException(
              'Usuário ou perfil não encontrado.',
            );
          }

          const oldProfile =
            await this.ensureCanManageProfile(
              tx,
              user.profileId,
              currentActor,
              false,
            );

          const profileChanged =
            user.profileId !== dto.profileId;

          if (
            profileChanged &&
            !currentActor.permissions.has(
              'users.assign_profile',
            )
          ) {
            throw new ForbiddenException(
              'Você não pode alterar o perfil do usuário.',
            );
          }

          if (id === actor.id && profileChanged) {
            throw new ForbiddenException(
              'Você não pode alterar seu próprio perfil.',
            );
          }

          const newProfile =
            await this.ensureCanManageProfile(
              tx,
              dto.profileId,
              currentActor,
              profileChanged || user.active,
            );

          if (
            user.active &&
            oldProfile.isSystem &&
            !newProfile.isSystem
          ) {
            const activeAdmins =
              await tx.user.count({
                where: {
                  active: true,
                  profile: {
                    isSystem: true,
                    active: true,
                  },
                },
              });

            if (activeAdmins <= 1) {
              throw new ForbiddenException(
                'O último administrador ativo não pode perder seu perfil.',
              );
            }
          }

          const updated = await tx.user.update({
            where: { id },

            data: {
              name: dto.name.trim(),

              username:
                dto.username.trim().toLowerCase(),

              profileId: newProfile.id,

              role: this.legacyRole(newProfile),
            },

            select: USER_SELECT,
          });

          if (profileChanged) {
            await tx.authSession.updateMany({
              where: {
                userId: id,
                revokedAt: null,
              },
              data: {
                revokedAt: new Date(),
              },
            });
          }

          await tx.auditLog.create({
            data: {
              userId: actor.id,
              action: 'USER_UPDATED',

              description: JSON.stringify({
                username: updated.username,
                oldProfile: oldProfile.name,
                newProfile: newProfile.name,
              }),

              entity: 'User',
              entityId: id,
            },
          });

          return updated;
        },

        {
          isolationLevel: 'Serializable',
        },
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateStatus(
    id: string,
    active: boolean,
    actor: AuthenticatedUser,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const currentActor = await this.getActor(
            tx,
            actor,
            ['users.status'],
          );

          const user = await tx.user.findUnique({
            where: { id },
          });

          if (!user || !user.profileId) {
            throw new NotFoundException(
              'Usuário não encontrado.',
            );
          }

          const profile =
            await this.ensureCanManageProfile(
              tx,
              user.profileId,
              currentActor,
              active,
            );

          if (id === actor.id && !active) {
            throw new ForbiddenException(
              'Você não pode desativar sua própria conta.',
            );
          }

          if (
            user.active &&
            profile.isSystem &&
            !active
          ) {
            const activeAdmins =
              await tx.user.count({
                where: {
                  active: true,
                  profile: {
                    isSystem: true,
                    active: true,
                  },
                },
              });

            if (activeAdmins <= 1) {
              throw new ForbiddenException(
                'O último administrador não pode ser desativado.',
              );
            }
          }

          const updated = await tx.user.update({
            where: { id },
            data: { active },
            select: USER_SELECT,
          });

          if (!active) {
            await tx.authSession.updateMany({
              where: {
                userId: id,
                revokedAt: null,
              },
              data: {
                revokedAt: new Date(),
              },
            });
          }

          await tx.auditLog.create({
            data: {
              userId: actor.id,

              action: active
                ? 'USER_ACTIVATED'
                : 'USER_DEACTIVATED',

              description:
                `Usuário ${user.username} ${active ? 'ativado' : 'desativado'}.`,

              entity: 'User',
              entityId: id,
            },
          });

          return updated;
        },

        {
          isolationLevel: 'Serializable',
        },
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  async resetPassword(
    id: string,
    password: string,
    actor: AuthenticatedUser,
  ) {
    if (id === actor.id) {
      throw new ForbiddenException(
        'Utilize a opção de alterar sua própria senha.',
      );
    }

    const passwordHash =
      await this.hashPassword(password);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const currentActor = await this.getActor(
            tx,
            actor,
            ['users.reset_password'],
          );

          const user = await tx.user.findUnique({
            where: { id },
          });

          if (!user || !user.profileId) {
            throw new NotFoundException(
              'Usuário não encontrado.',
            );
          }

          await this.ensureCanManageProfile(
            tx,
            user.profileId,
            currentActor,
            false,
          );

          await tx.user.update({
            where: { id },

            data: {
              passwordHash,
              mustChangePassword: true,
            },
          });

          await tx.authSession.updateMany({
            where: {
              userId: id,
              revokedAt: null,
            },

            data: {
              revokedAt: new Date(),
            },
          });

          await tx.auditLog.create({
            data: {
              userId: actor.id,
              action: 'PASSWORD_RESET',

              description:
                `Senha de ${user.username} redefinida.`,

              entity: 'User',
              entityId: id,
            },
          });

          return {
            message: 'Senha redefinida com sucesso.',
          };
        },

        {
          isolationLevel: 'Serializable',
        },
      );
    } catch (error) {
      this.handleError(error);
    }
  }
}
