
import type { Request } from 'express';

import type { UserRole } from '../generated/prisma/enums';

export interface AuthenticatedProfile {
  id: string;
  code: string;
  name: string;
  active: boolean;
  isSystem: boolean;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;

  // Mantido temporariamente para compatibilidade.
  role: UserRole;

  active: boolean;
  mustChangePassword: boolean;

  profileId: string;
  profile: AuthenticatedProfile;

  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
