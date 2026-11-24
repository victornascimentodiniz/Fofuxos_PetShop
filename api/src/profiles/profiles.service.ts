
import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';

import type { Prisma } from '../generated/prisma/client';

import type {
  AuthenticatedUser,
} from '../auth/auth.types';

import {
  PROFILE_SELECT,
  type ProfileData,
} from './profiles.constants';

import {
  CreateProfileDto,
} from './dto/create-profile.dto';

import {
  UpdateProfileDto,
} from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private formatProfile(profile: ProfileData) {
    return {
      id: profile.id,
      code: profile.code,
      name: profile.name,
      description: profile.description,
      active: profile.active,
      isSystem: profile.isSystem,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,

      usersCount: profile._count.users,

      permissionsCount: profile._count.permissions,

      permissions: profile.permissions.map(
        (item) => item.permission,
      ),
    };
  }

  private handleError(error: unknown): never {
    const code =
      (error as { code?: string } | null)?.code;

    if (code === 'P2002') {
      throw new ConflictException(
        'Já existe um perfil com este nome.',
      );
    }

    if (code === 'P2034') {
      throw new ConflictException(
        'Outra alteração está em andamento. Tente novamente.',
      );
    }

    throw error;
  }

  private async getProfile(
    tx: Prisma.TransactionClient,
    id: string,
  ) {
    const profile = await tx.profile.findUnique({
      where: { id },
      select: PROFILE_SELECT,
    });

    if (!profile) {
      throw new NotFoundException(
        'Perfil de acesso não encontrado.',
      );
    }

    return profile;
  }

  private ensureMutable(profile: ProfileData) {
    if (profile.isSystem) {
      throw new ForbiddenException(
        'Este perfil é protegido pelo sistema.',
      );
    }
  }

  private async ensureUniqueName(
    tx: Prisma.TransactionClient,
    name: string,
    ignoredId?: string,
  ) {
    const existing = await tx.profile.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },

        ...(ignoredId
          ? {
              id: {
                not: ignoredId,
              },
            }
          : {}),
      },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe um perfil com este nome.',
      );
    }
  }

  private async getActorPermissions(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedUser,
    required: string[],
  ) {
    const currentActor = await tx.user.findUnique({
      where: {
        id: actor.id,
      },

      select: {
        active: true,
        mustChangePassword: true,

        profile: {
          select: {
            active: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
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
      required.some(
        (permission) => !permissions.has(permission),
      )
    ) {
      throw new ForbiddenException(
        'Você não possui permissão para esta operação.',
      );
    }

    return permissions;
  }

  private ensureCanManagePermissions(
    permissionCodes: string[],
    actorPermissions: Set<string>,
  ) {
    const unauthorized = permissionCodes.filter(
      (code) => !actorPermissions.has(code),
    );

    if (unauthorized.length > 0) {
      throw new ForbiddenException(
        'Você não pode administrar permissões que não possui.',
      );
    }
  }

  private ensureCanManageProfile(
    profile: ProfileData,
    actorPermissions: Set<string>,
  ) {
    const currentPermissions =
      profile.permissions.map(
        (item) => item.permission.code,
      );

    this.ensureCanManagePermissions(
      currentPermissions,
      actorPermissions,
    );
  }

  private async resolvePermissions(
    tx: Prisma.TransactionClient,
    permissionCodes: string[],
  ) {
    const codes = [...new Set(permissionCodes)];

    const permissions = await tx.permission.findMany({
      where: {
        code: {
          in: codes,
        },
      },

      select: {
        id: true,
        code: true,
      },
    });

    if (permissions.length !== codes.length) {
      const validCodes = new Set(
        permissions.map((item) => item.code),
      );

      const invalidCodes = codes.filter(
        (code) => !validCodes.has(code),
      );

      throw new BadRequestException(
        `Permissões inválidas: ${invalidCodes.join(', ')}`,
      );
    }

    return permissions;
  }

  async findAll() {
    const profiles = await this.prisma.profile.findMany({
      select: PROFILE_SELECT,

      orderBy: [
        { isSystem: 'desc' },
        { active: 'desc' },
        { name: 'asc' },
      ],
    });

    return profiles.map(
      (profile) => this.formatProfile(profile),
    );
  }

  async findOne(id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id },
      select: PROFILE_SELECT,
    });

    if (!profile) {
      throw new NotFoundException(
        'Perfil de acesso não encontrado.',
      );
    }

    return this.formatProfile(profile);
  }

  async create(
    dto: CreateProfileDto,
    actor: AuthenticatedUser,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const required = ['profiles.create'];

          if (dto.permissionCodes.length > 0) {
            required.push('profiles.permissions');
          }

          const actorPermissions =
            await this.getActorPermissions(
              tx,
              actor,
              required,
            );

          await this.ensureUniqueName(tx, dto.name);

          const permissions =
            await this.resolvePermissions(
              tx,
              dto.permissionCodes,
            );

          this.ensureCanManagePermissions(
            dto.permissionCodes,
            actorPermissions,
          );

          const profile = await tx.profile.create({
            data: {
              code: `CUSTOM_${randomUUID()}`,

              name: dto.name.trim(),

              description:
                dto.description?.trim() || null,

              active: true,

              isSystem: false,

              permissions: {
                create: permissions.map(
                  (permission) => ({
                    permissionId: permission.id,
                  }),
                ),
              },
            },

            select: PROFILE_SELECT,
          });

          await tx.auditLog.create({
            data: {
              userId: actor.id,
              action: 'PROFILE_CREATED',
              description:
                `Perfil ${profile.name} cadastrado com ${permissions.length} permissões.`,
              entity: 'Profile',
              entityId: profile.id,
            },
          });

          return this.formatProfile(profile);
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
    dto: UpdateProfileDto,
    actor: AuthenticatedUser,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const actorPermissions =
            await this.getActorPermissions(
              tx,
              actor,
              ['profiles.update'],
            );

          const profile =
            await this.getProfile(tx, id);

          this.ensureMutable(profile);

          this.ensureCanManageProfile(
            profile,
            actorPermissions,
          );

          await this.ensureUniqueName(
            tx,
            dto.name,
            id,
          );

          const updated = await tx.profile.update({
            where: { id },

            data: {
              name: dto.name.trim(),

              ...(dto.description !== undefined
                ? {
                    description:
                      dto.description?.trim() || null,
                  }
                : {}),
            },

            select: PROFILE_SELECT,
          });

          await tx.auditLog.create({
            data: {
              userId: actor.id,
              action: 'PROFILE_UPDATED',
              description:
                `Perfil ${profile.name} atualizado para ${updated.name}.`,
              entity: 'Profile',
              entityId: id,
            },
          });

          return this.formatProfile(updated);
        },

        {
          isolationLevel: 'Serializable',
        },
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  async updatePermissions(
    id: string,
    permissionCodes: string[],
    actor: AuthenticatedUser,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const actorPermissions =
            await this.getActorPermissions(
              tx,
              actor,
              ['profiles.permissions'],
            );

          const profile =
            await this.getProfile(tx, id);

          this.ensureMutable(profile);

          this.ensureCanManageProfile(
            profile,
            actorPermissions,
          );

          const permissions =
            await this.resolvePermissions(
              tx,
              permissionCodes,
            );

          this.ensureCanManagePermissions(
            permissionCodes,
            actorPermissions,
          );

          if (profile.id === actor.profileId) {
            throw new ForbiddenException(
              'Você não pode alterar as permissões do seu próprio perfil.',
            );
          }

          const previousCodes = new Set(
            profile.permissions.map(
              (item) => item.permission.code,
            ),
          );

          const newCodes = new Set(permissionCodes);

          const added = permissionCodes.filter(
            (code) => !previousCodes.has(code),
          );

          const removed = [...previousCodes].filter(
            (code) => !newCodes.has(code),
          );

          await tx.profilePermission.deleteMany({
            where: {
              profileId: id,
            },
          });

          if (permissions.length > 0) {
            await tx.profilePermission.createMany({
              data: permissions.map(
                (permission) => ({
                  profileId: id,
                  permissionId: permission.id,
                }),
              ),
            });
          }

          const updated = await tx.profile.update({
            where: { id },

            data: {
              updatedAt: new Date(),
            },

            select: PROFILE_SELECT,
          });

          await tx.auditLog.create({
            data: {
              userId: actor.id,
              action: 'PROFILE_PERMISSIONS_UPDATED',

              description: JSON.stringify({
                profile: profile.name,
                added,
                removed,
              }),

              entity: 'Profile',
              entityId: id,
            },
          });

          return this.formatProfile(updated);
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
          const actorPermissions =
            await this.getActorPermissions(
              tx,
              actor,
              ['profiles.status'],
            );

          const profile =
            await this.getProfile(tx, id);

          this.ensureMutable(profile);

          this.ensureCanManageProfile(
            profile,
            actorPermissions,
          );

          if (id === actor.profileId && !active) {
            throw new ForbiddenException(
              'Você não pode desativar seu próprio perfil.',
            );
          }

          if (!active) {
            const activeUsers = await tx.user.count({
              where: {
                profileId: id,
                active: true,
              },
            });

            if (activeUsers > 0) {
              throw new ConflictException(
                'Existem usuários ativos vinculados a este perfil. Transfira-os para outro perfil antes de desativá-lo.',
              );
            }
          }

          const updated = await tx.profile.update({
            where: { id },

            data: { active },

            select: PROFILE_SELECT,
          });

          if (!active) {
            await tx.authSession.updateMany({
              where: {
                revokedAt: null,

                user: {
                  profileId: id,
                },
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
                ? 'PROFILE_ACTIVATED'
                : 'PROFILE_DEACTIVATED',

              description:
                `Perfil ${profile.name} ${active ? 'ativado' : 'desativado'}.`,

              entity: 'Profile',
              entityId: id,
            },
          });

          return this.formatProfile(updated);
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
