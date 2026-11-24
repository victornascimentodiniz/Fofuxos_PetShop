
import type { Prisma } from '../generated/prisma/client';

export const AUTH_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  role: true,
  active: true,
  mustChangePassword: true,
  profileId: true,

  profile: {
    select: {
      id: true,
      code: true,
      name: true,
      active: true,
      isSystem: true,

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
} satisfies Prisma.UserSelect;

export type AuthUserData = Prisma.UserGetPayload<{
  select: typeof AUTH_USER_SELECT;
}>;
