import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// What: Guard that enforces JWT authentication.
// Why: Use @UseGuards(JwtAuthGuard) on routes requiring authentication.
//
// Usage:
//   @UseGuards(JwtAuthGuard)
//   @Get('protected')
//   protectedRoute(@User() user) { ... }
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Add custom authentication logic here if needed.
    return super.canActivate(context);
  }
}
