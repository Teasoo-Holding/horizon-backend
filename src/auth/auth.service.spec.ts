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

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn(), create: jest.fn() },
            company: {
              findFirst: jest.fn().mockResolvedValue({ id: 1, name: 'TestCo' }),
            },
            refreshToken: { create: jest.fn(), findUnique: jest.fn() },
            role: {
              findUnique: jest
                .fn()
                .mockResolvedValue({
                  id: 'role-id',
                  name: 'SUSTAINABILITY_MANAGER',
                }),
            },
            permission: {
              findUnique: jest
                .fn()
                .mockResolvedValue({
                  id: 'perm-id',
                  name: 'can:edit',
                  description: 'can edit stuff',
                }),
            },
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
          useValue: {
            generateOtp: jest
              .fn()
              .mockReturnValue({ otp: '123456', expiresAt: new Date() }),
            storeOtp: jest.fn(),
          },
        },
        {
          provide: 'ActivitiesService',
          useValue: {
            logActivity: jest.fn(),
          },
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
        full_name: 'John Doe',
        phoneNumber: '08012345678',
        company: 'TestCo',
        role: 'company_esg_admin',
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
        full_name: 'John Doe',
        phoneNumber: '08012345678',
        company: 'TestCo',
        role: 'company_esg_admin',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });

      await expect(service.register(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('should validate user and return access/refresh tokens', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        status: 'APPROVED',
        companyId: 1,
        role: { name: 'USER' },
        company: { name: 'Test Company' },
      };

      // First validate the user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        refresh_token: 'mockRefreshToken',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue(user);

      const validatedUser = await service.validateUser(
        'test@example.com',
        'password123',
      );

      // Then login with the validated user (transform role object to string)
      const loginPayload = {
        id: validatedUser.id,
        email: validatedUser.email,
        role: validatedUser.role.name,
        companyId: validatedUser.companyId || 1,
      };
      const result = await service.login(loginPayload);

      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw if user not found during validation', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.validateUser('bad@example.com', 'pass'),
      ).rejects.toThrow();
    });

    it('should throw if password is invalid', async () => {
      const badUser = {
        id: 1,
        email: 'test@example.com',
        password: await bcrypt.hash('wrongpass', 10),
        status: 'APPROVED',
        companyId: 1,
        role: { name: 'USER' },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(badUser);
      await expect(
        service.validateUser('test@example.com', 'pass'),
      ).rejects.toThrow();
    });
  });

  describe('refresh', () => {
    it('should return user with valid refresh token', async () => {
      const mockUser = { id: 1, email: 'test@example.com', status: 'PENDING' };

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
