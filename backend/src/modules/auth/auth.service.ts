import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../common/enums/role.enum';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  private readonly users = [
    {
      user_id: '00000000-0000-0000-0000-000000000001',
      username: 'admin',
      password: 'admin123',
      role: Role.ADMIN,
      tenant_id: '00000000-0000-0000-0000-000000000001',
    },
    {
      user_id: '00000000-0000-0000-0000-000000000002',
      username: 'alice',
      password: 'alice123',
      role: Role.CUSTOMER,
      tenant_id: '00000000-0000-0000-0000-000000000001',
    },
    {
      user_id: '00000000-0000-0000-0000-000000000003',
      username: 'bob',
      password: 'bob123',
      role: Role.CUSTOMER,
      tenant_id: '00000000-0000-0000-0000-000000000001',
    },
    {
      user_id: '00000000-0000-0000-0000-000000000004',
      username: 'charlie',
      password: 'charlie123',
      role: Role.CUSTOMER,
      tenant_id: '00000000-0000-0000-0000-000000000001',
    },
  ];

  constructor(private readonly jwtService: JwtService) {}

  async login(dto: LoginDto) {
    const user = this.users.find(
      (u) => u.username === dto.username && u.password === dto.password,
    );

    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid username or password',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    const payload: JwtPayload = {
      user_id: user.user_id,
      tenant_id: user.tenant_id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    };
  }

  getUsers() {
    return this.users.map(({ password, ...rest }) => rest);
  }
}
