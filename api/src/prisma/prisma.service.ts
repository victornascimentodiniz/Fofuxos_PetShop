
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const databaseUrl =
      configService.getOrThrow<string>('DATABASE_URL');

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();

      await this.$queryRaw`SELECT 1`;

      this.logger.log(
        'Conexão com o PostgreSQL estabelecida com sucesso.',
      );
    } catch (error) {
      this.logger.error(
        'Não foi possível conectar ao banco de dados.',
      );

      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();

    this.logger.log(
      'Conexão com o PostgreSQL encerrada.',
    );
  }
}
