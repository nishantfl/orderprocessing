import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { Role } from '../src/common/enums/role.enum';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/auth/login', () => {
    it('should return 200 and access_token for valid admin credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body.access_token).toBeDefined();
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toMatchObject({
        username: 'admin',
        role: Role.ADMIN,
        user_id: '00000000-0000-0000-0000-000000000001',
        tenant_id: '00000000-0000-0000-0000-000000000001',
      });
    });

    it('should return 200 and access_token for valid customer credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ username: 'alice', password: 'alice123' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body.user).toMatchObject({
        username: 'alice',
        role: Role.CUSTOMER,
      });
    });

    it('should return 401 for invalid username', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ username: 'invalid', password: 'admin123' })
        .expect(401);

      expect(res.body).toMatchObject({
        message: 'Invalid username or password',
        errorCode: 'INVALID_CREDENTIALS',
      });
    });

    it('should return 401 for invalid password', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ username: 'admin', password: 'wrong' })
        .expect(401);

      expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('should return 400 for empty username', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ username: '', password: 'admin123' })
        .expect(400);
    });

    it('should return 400 for missing body', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({})
        .expect(400);
    });
  });
});
