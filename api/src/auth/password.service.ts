import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class PasswordService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.active || !user.profile?.active) {
      throw new UnauthorizedException(
        'Usuario nao autorizado.',
      );
    }

    const validPassword = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!validPassword) {
      throw new BadRequestException(
        'A senha atual esta incorreta.',
      );
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual.',
      );
    }

    const passwordHash = await argon2.hash(
      dto.newPassword,
      {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      },
    );

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: {
          id: userId,
          active: true,
          passwordHash: user.passwordHash,
          profile: {
            active: true,
          },
        },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      });

      if (result.count !== 1) {
        throw new ConflictException(
          'Cadastro alterado. Tente novamente.',
        );
      }

      await tx.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'PASSWORD_CHANGED',
          description: 'Usuario alterou sua propria senha.',
          entity: 'User',
          entityId: userId,
        },
      });
    });

    return {
      message: 'Senha alterada com sucesso. Realize o login novamente.',
    };
  }
}
