import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// What: JWT payload structure expected in tokens.
// Why: Defines the contract for authenticated user data.
export interface JwtPayload {
  user_id: string;
  tenant_id: string;
  role: string;
  iat?: number;
  exp?: number;
}

// What: Passport strategy that validates JWT tokens.
// Why: Extracts and validates tokens, attaches user to request.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret-change-in-prod'),
    });
  }

  // What: Validates the JWT payload and returns user object.
  // Why: This method is called after the token is verified.
  //      The returned value becomes req.user in controllers.
  async validate(payload: JwtPayload) {
    if (!payload.user_id || !payload.tenant_id || !payload.role) {
      throw new UnauthorizedException({
        message: 'Invalid token payload',
        errorCode: 'INVALID_TOKEN',
      });
    }

    // Return user object that will be attached to request.
    return {
      user_id: payload.user_id,
      tenant_id: payload.tenant_id,
      role: payload.role,
    };
  }
}
