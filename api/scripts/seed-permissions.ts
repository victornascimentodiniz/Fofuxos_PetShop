
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { UserRole } from '../src/generated/prisma/enums';

import {
  PERMISSIONS,
  type PermissionCode,
} from '../src/permissions/permissions.catalog';

const OPERATOR_PERMISSIONS: PermissionCode[] = [
  'pos.access',
  'pos.open',
  'pos.close',
  'pos.sell',
  'products.view',
  'customers.view',
  'customers.create',
  'pets.view',
];

const MANAGER_PERMISSIONS: PermissionCode[] =
  PERMISSIONS
    .filter((permission) => {
      const restrictedModules = [
        'users.',
        'profiles.',
        'audit.',
        'settings.',
        'backup.',
      ];

      return !restrictedModules.some((prefix) =>
        permission.code.startsWith(prefix),
      );
    })
    .map((permission) => permission.code);

async function main() {
  console.log('\nIniciando configuracao de perfis...');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL nao configurada.');
  }

  if (PERMISSIONS.length === 0) {
    throw new Error('Catalogo de permissoes vazio.');
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();

    console.log('PostgreSQL conectado com sucesso.');

    const result = await prisma.$transaction(
      async (tx) => {
        console.log('Sincronizando permissoes...');

        for (const permission of PERMISSIONS) {
          await tx.permission.upsert({
            where: {
              code: permission.code,
            },

            update: {
              name: permission.name,
              module: permission.module,
            },

            create: {
              code: permission.code,
              name: permission.name,
              module: permission.module,
            },
          });
        }

        const allPermissions =
          await tx.permission.findMany({
            select: {
              id: true,
              code: true,
            },
          });

        const defaultProfiles = [
          {
            code: 'ADMINISTRATOR',
            name: 'Administrador',
            description: 'Acesso completo ao sistema.',
            isSystem: true,
            permissions: PERMISSIONS.map(
              (permission) => permission.code,
            ),
            legacyRole: UserRole.ADMIN,
          },
          {
            code: 'MANAGER',
            name: 'Gerente',
            description: 'Gerenciamento operacional.',
            isSystem: false,
            permissions: MANAGER_PERMISSIONS,
            legacyRole: UserRole.MANAGER,
          },
          {
            code: 'CASHIER',
            name: 'Operador de caixa',
            description: 'Operacoes de venda e atendimento.',
            isSystem: false,
            permissions: OPERATOR_PERMISSIONS,
            legacyRole: UserRole.OPERATOR,
          },
        ];

        for (const definition of defaultProfiles) {
          const existingProfile =
            await tx.profile.findUnique({
              where: {
                code: definition.code,
              },
            });

          const profile =
            existingProfile ??
            await tx.profile.create({
              data: {
                code: definition.code,
                name: definition.name,
                description: definition.description,
                active: true,
                isSystem: definition.isSystem,
              },
            });

          if (definition.isSystem) {
            await tx.profile.update({
              where: {
                id: profile.id,
              },
              data: {
                active: true,
                isSystem: true,
              },
            });
          }

          if (!existingProfile || definition.isSystem) {
            const permissionIds = allPermissions
              .filter((permission) =>
                definition.permissions.includes(
                  permission.code as PermissionCode,
                ),
              )
              .map((permission) => permission.id);

            await tx.profilePermission.createMany({
              data: permissionIds.map(
                (permissionId) => ({
                  profileId: profile.id,
                  permissionId,
                }),
              ),
              skipDuplicates: true,
            });
          }

          const linkedUsers = await tx.user.updateMany({
            where: {
              role: definition.legacyRole,
              profileId: null,
            },

            data: {
              profileId: profile.id,
            },
          });

          console.log(
            `Perfil: ${profile.name} | Usuarios vinculados: ${linkedUsers.count}`,
          );
        }

        const usersWithoutProfile = await tx.user.count({
          where: {
            profileId: null,
          },
        });

        if (usersWithoutProfile > 0) {
          throw new Error(
            'Ainda existem usuarios sem perfil.',
          );
        }

        const profiles = await tx.profile.findMany({
          select: {
            name: true,
            code: true,
            active: true,
            isSystem: true,
            _count: {
              select: {
                users: true,
                permissions: true,
              },
            },
          },
        });

        return {
          permissionCount: await tx.permission.count(),
          profiles,
        };
      },
      {
        timeout: 60000,
        isolationLevel: 'Serializable',
      },
    );

    console.log(
      '\nTotal de permissoes:',
      result.permissionCount,
    );

    console.table(
      result.profiles.map((profile) => ({
        perfil: profile.name,
        codigo: profile.code,
        ativo: profile.active,
        protegido: profile.isSystem,
        usuarios: profile._count.users,
        permissoes: profile._count.permissions,
      })),
    );

    console.log(
      '\nInicializacao concluida com sucesso!',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    '\nErro:',
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
});
