jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { EmailService } from 'src/email/email.service';
import { OtpService } from 'src/otp/otp.service';
import { AccessLevels } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn(), create: jest.fn() },
            company: { findFirst: jest.fn().mockResolvedValue({ id: 1, name: 'TestCo' }) },
            refreshToken: { create: jest.fn(), findUnique: jest.fn() },
            role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-id', name: 'SUSTAINABILITY_MANAGER' }) },
            permission: { findUnique: jest.fn().mockResolvedValue({ id: 'perm-id', name: 'can:edit', description: 'can edit stuff' }) },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mockAccessToken') },
        },
        {
          provide: EmailService,
          useValue: { sendEmail: jest.fn(), sendVerificationEmail: jest.fn() },
        },
        {
          provide: OtpService,
          useValue: { generateOtp: jest.fn().mockReturnValue({ otp: '123456', expiresAt: new Date() }), storeOtp: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

    describe('register', () => {
    it('should register a new user', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        phoneNumber: '08012345678',
        company: 'TestCo',
        role: 'SUSTAINABILITY_MANAGER',
        accessLevel: AccessLevels.ESG_ADMIN,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation(({ data }) => ({
        ...data,
        id: 1,
      }));

      const result = await service.register(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).not.toHaveProperty('password');
    });

    it('should throw if email already exists', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        phoneNumber: '08012345678',
        company: 'TestCo',
        role: 'SUSTAINABILITY_MANAGER',
        accessLevel: AccessLevels.ESG_ADMIN,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });

      await expect(service.register(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('should login and return access/refresh tokens and user', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };

      const user = {
        id: 1,
        email: dto.email,
        password: await bcrypt.hash(dto.password, 10),
        status: "APPROVED",
        role: "USER",
        companyId: 1,
        sub: 1
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...user,
        status: "APPROVED",
        role: { name: "USER"},
        company: { name: 'Test Company' }
      });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        refresh_token: 'mockRefreshToken',
      });

      const result = await service.login(dto);

      expect(jwtService.sign).toHaveBeenCalledWith(expect.objectContaining({
        sub: user.id,
        email: user.email,

      }));
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.login({ email: 'bad@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if password is invalid', async () => {
      const badUser = {
        id: 1,
        email: 'test@example.com',
        password: await bcrypt.hash('wrongpass', 10),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(badUser);
      await expect(
        service.login({ email: 'test@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return user with valid refresh token', async () => {
      const mockUser = { id: 1, email: 'test@example.com' , status: 'PENDING'};

      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        user_id: 1,
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.refresh('mockRefreshToken');

      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { refresh_token: 'mockRefreshToken' },
      });
      expect(result.user).toEqual(mockUser);
    });

    it('should throw if refresh token is invalid', async () => {
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh('invalidToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
