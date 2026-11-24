
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { UserRole } from '../src/generated/prisma/enums';
import * as argon2 from 'argon2';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  const name = (process.env.ADMIN_NAME ?? '').trim();

  const username = (process.env.ADMIN_USERNAME ?? '')
    .trim()
    .toLowerCase();

  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada.');
  }

  if (name.length < 3 || name.length > 120) {
    throw new Error('Nome deve possuir entre 3 e 120 caracteres.');
  }

  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    throw new Error('Nome de usuário inválido.');
  }

  if (password.length < 12 || password.length > 128) {
    throw new Error(
      'A senha deve possuir entre 12 e 128 caracteres.',
    );
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    const admin = await prisma.$transaction(
      async (tx) => {
        const existingAdmin = await tx.user.findFirst({
          where: {
            role: UserRole.ADMIN,
          },
        });

        if (existingAdmin) {
          throw new Error(
            'Já existe um administrador cadastrado.',
          );
        }

        const existingUser = await tx.user.findUnique({
          where: {
            username,
          },
        });

        if (existingUser) {
          throw new Error(
            'Este nome de usuário já está em uso.',
          );
        }

        const user = await tx.user.create({
          data: {
            name,
            username,
            passwordHash,
            role: UserRole.ADMIN,
            active: true,
            mustChangePassword: false,
          },

          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            active: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'ADMIN_BOOTSTRAP',
            description:
              'Primeiro administrador criado pelo script de inicialização.',
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

    console.log('\nAdministrador criado com sucesso!\n');

    console.table([admin]);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    'Erro:',
    error instanceof Error
      ? error.message
      : 'Erro inesperado.',
  );

  process.exitCode = 1;
});
