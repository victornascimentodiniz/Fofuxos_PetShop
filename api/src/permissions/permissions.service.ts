
import { Injectable } from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll() {
    return this.prisma.permission.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        module: true,
        description: true,
      },

      orderBy: [
        { module: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findGrouped() {
    const permissions =
      await this.findAll();

    type Permission =
      (typeof permissions)[number];

    const modules = new Map<
      string,
      Permission[]
    >();

    for (const permission of permissions) {
      const currentPermissions =
        modules.get(permission.module) ?? [];

      currentPermissions.push(permission);

      modules.set(
        permission.module,
        currentPermissions,
      );
    }

    return {
      total: permissions.length,

      modules: Array.from(
        modules.entries(),
      ).map(
        ([module, items]) => ({
          module,
          total: items.length,
          permissions: items,
        }),
      ),
    };
  }
}
