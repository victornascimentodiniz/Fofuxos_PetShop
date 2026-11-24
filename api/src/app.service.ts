
import { Injectable } from '@nestjs/common';

import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      application: 'Fofuxos Gestão',
      version: '0.1.0',
      status: 'online',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
