import type { Prisma } from '../generated/prisma/client';

export const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  active: true,
  profileId: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,

  profile: {
    select: {
      id: true,
      code: true,
      name: true,
      active: true,
      isSystem: true,
    },
  },
} satisfies Prisma.UserSelect;

export type UserData = Prisma.UserGetPayload<{
  select: typeof USER_SELECT;
}>;