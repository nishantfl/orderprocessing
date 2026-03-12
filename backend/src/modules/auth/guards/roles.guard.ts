import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

// What: Guard that enforces role-based authorization.
// Why: Ensures only users with required roles can access certain routes.
//
// Usage:
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles(Role.ADMIN)
//   @Get('admin-only')
//   adminRoute() { ... }
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from route metadata.
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, allow access.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Extract user from request (set by JwtAuthGuard).
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException({
        message: 'User not authenticated',
        errorCode: 'UNAUTHENTICATED',
      });
    }

    // Check if user has any of the required roles.
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException({
        message: `Requires one of: ${requiredRoles.join(', ')}`,
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    return true;
  }
}
