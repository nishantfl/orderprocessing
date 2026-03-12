import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../common/enums/role.enum';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
  });

  describe('login', () => {
    it('should return access_token and user for valid admin credentials', async () => {
      const dto: LoginDto = { username: 'admin', password: 'admin123' };

      const result = await service.login(dto);

      expect(result).toMatchObject({
        access_token: 'mock-jwt-token',
        user: {
          user_id: '00000000-0000-0000-0000-000000000001',
          username: 'admin',
          role: Role.ADMIN,
          tenant_id: '00000000-0000-0000-0000-000000000001',
        },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        user_id: '00000000-0000-0000-0000-000000000001',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        role: Role.ADMIN,
      });
    });

    it('should return access_token and user for valid customer credentials', async () => {
      const dto: LoginDto = { username: 'alice', password: 'alice123' };

      const result = await service.login(dto);

      expect(result).toMatchObject({
        access_token: 'mock-jwt-token',
        user: {
          user_id: '00000000-0000-0000-0000-000000000002',
          username: 'alice',
          role: Role.CUSTOMER,
          tenant_id: '00000000-0000-0000-0000-000000000001',
        },
      });
    });

    it('should throw UnauthorizedException for invalid username', async () => {
      const dto: LoginDto = { username: 'nonexistent', password: 'admin123' };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toMatchObject({
        response: {
          message: 'Invalid username or password',
          errorCode: 'INVALID_CREDENTIALS',
        },
      });
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const dto: LoginDto = { username: 'admin', password: 'wrongpassword' };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toMatchObject({
        response: { errorCode: 'INVALID_CREDENTIALS' },
      });
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for empty credentials', async () => {
      const dto: LoginDto = { username: '', password: '' };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should authenticate bob successfully', async () => {
      const dto: LoginDto = { username: 'bob', password: 'bob123' };

      const result = await service.login(dto);

      expect(result.user.username).toBe('bob');
      expect(result.user.role).toBe(Role.CUSTOMER);
    });

    it('should authenticate charlie successfully', async () => {
      const dto: LoginDto = { username: 'charlie', password: 'charlie123' };

      const result = await service.login(dto);

      expect(result.user.username).toBe('charlie');
      expect(result.user.role).toBe(Role.CUSTOMER);
    });
  });

  describe('getUsers', () => {
    it('should return all users without passwords', () => {
      const result = service.getUsers();

      expect(result).toHaveLength(4);
      expect(result.every((u) => !('password' in u))).toBe(true);
      expect(result.map((u) => u.username)).toEqual(['admin', 'alice', 'bob', 'charlie']);
    });

    it('should include user_id, username, role, tenant_id for each user', () => {
      const result = service.getUsers();

      result.forEach((user) => {
        expect(user).toHaveProperty('user_id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('tenant_id');
      });
    });
  });
});
