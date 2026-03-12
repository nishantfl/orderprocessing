import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// What: Parameter decorator that extracts user data from the request.
// Why: Simplifies getting authenticated user info in controllers.
//
// Usage:
//   @Get('profile')
//   getProfile(@User() user: any) {
//     return user; // { user_id, tenant_id, role }
//   }
//
//   @Get('id')
//   getUserId(@User('user_id') userId: string) {
//     return userId;
//   }
export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return just that.
    // Otherwise return the full user object.
    return data ? user?.[data] : user;
  },
);
