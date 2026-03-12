import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

// What: Decorator that attaches required roles to route metadata.
// Why: Lets RolesGuard enforce role-based access control declaratively.
//
// Usage:
//   @Roles(Role.ADMIN)
//   @Get('admin-only')
//   adminEndpoint() { ... }
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
