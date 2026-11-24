
import type { Prisma } from '../generated/prisma/client';

export const PROFILE_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  active: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,

  permissions: {
    select: {
      permission: {
        select: {
          id: true,
          code: true,
          name: true,
          module: true,
          description: true,
        },
      },
    },
  },

  _count: {
    select: {
      users: true,
      permissions: true,
    },
  },
} satisfies Prisma.ProfileSelect;

export type ProfileData = Prisma.ProfileGetPayload<{
  select: typeof PROFILE_SELECT;
}>;
