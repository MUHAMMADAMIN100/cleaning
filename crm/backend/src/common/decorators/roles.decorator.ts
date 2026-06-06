import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
/** Ограничивает доступ к роуту указанными ролями */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
