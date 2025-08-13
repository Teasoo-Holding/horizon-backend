import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { OtpService } from 'src/otp/otp.service';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AdminAuthService } from './auth.service';
import { AccessLevels } from '@prisma/client';

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let emailService: jest.Mocked<EmailService>;
  let otpService: jest.Mocked<OtpService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedPassword',
    first_name: 'John',
    last_name: 'Doe',
    phone_number: '1234567890',
    roleId: 2,
    companyId: 0,
    status: 'PENDING',
    departmentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    accessLevel: AccessLevels.SUPER_ADMIN,
  };

  const mockRegisterDto = {
    email: 'test@example.com',
    password: 'password123',
    first_name: 'John',
    last_name: 'Doe',
    phone_number: '1234567890',
    roleId: 2,
    departmentId: 1,
    role: 'ADMIN',
    accessLevel: AccessLevels.SUPER_ADMIN,
  };

  const mockTeasoAdminSendRequest = {
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User',
    phone_number: '0987654321',
    password: 'adminpass',
    roleId: 2,
    departmentId: 1,
    role: 'ADMIN',
    companyId: 1,
    accessLevel: AccessLevels.SUPER_ADMIN,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockEmailService = {
      sendEmail: jest.fn(),
    };

    const mockOtpService = {
      generateOtp: jest.fn(),
      storeOtp: jest.fn(),
      verifyOtp: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
    prismaService = module.get(PrismaService);
    emailService = module.get(EmailService);
    otpService = module.get(OtpService);
    jwtService = module.get(JwtService);
  });

  describe('registerAdmin', () => {
    beforeEach(() => {
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
    });

    it('should register a new admin successfully', async () => {
  // Mock findUnique to return null (user doesn't exist)
  (prismaService.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
  
  // Mock create to return the new user
  (prismaService.user.create as jest.Mock).mockResolvedValueOnce(mockUser);
  
  // Mock OTP and email services
  (otpService.generateOtp as jest.Mock).mockReturnValueOnce('123456');
  (otpService.storeOtp as jest.Mock).mockResolvedValueOnce(undefined);
  (emailService.sendEmail as jest.Mock).mockResolvedValueOnce(undefined);

  const result = await service.registerAdmin(mockRegisterDto);

  // Assertions
  expect(prismaService.user.findUnique).toHaveBeenCalledWith({
    where: { email: mockRegisterDto.email },
  });
  expect(mockedBcrypt.hash).toHaveBeenCalledWith(mockRegisterDto.password, 10);
  
  // Update this expectation to match your actual service implementation
  expect(prismaService.user.create).toHaveBeenCalledWith({
    data: {
      email: mockRegisterDto.email,
      password: 'hashedPassword',
      first_name: mockRegisterDto.first_name,
      last_name: mockRegisterDto.last_name,
      phone_number: mockRegisterDto.phone_number,
      roleId: 2,
      companyId: 0,
      status: 'PENDING',
      accessLevel: AccessLevels.SUPER_ADMIN // Update this if needed
    },
  });
  expect(result).toEqual(mockUser);
});

    it('should throw ConflictException if user already exists', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.registerAdmin(mockRegisterDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const updatedUser = { ...mockUser, status: 'APPROVED' };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (otpService.verifyOtp as jest.Mock).mockResolvedValue(true);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'APPROVED',
      });

      const result = await service.verifyEmail('test@example.com', '123456');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(otpService.verifyOtp).toHaveBeenCalledWith(mockUser.id, '123456');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { status: 'APPROVED' },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.verifyEmail('test@example.com', '123456'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if OTP verification fails', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (otpService.verifyOtp as jest.Mock).mockResolvedValue('Invalid OTP');

      await expect(
        service.verifyEmail('test@example.com', '123456'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('inviteAdminUser', () => {
    it('should invite admin user successfully', async () => {
      const newUser = { ...mockUser, email: 'admin@example.com' };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(newUser);
      (jwtService.sign as jest.Mock).mockReturnValue('jwt-token');
      (emailService.sendEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.inviteAdminUser(
        mockTeasoAdminSendRequest,
        1,
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockTeasoAdminSendRequest.email },
      });
      expect(prismaService.user.create).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith(
        { userId: newUser.id, email: newUser.email },
        { expiresIn: '24h' },
      );
      expect(result.status).toBe('success');
      expect(result.token).toBe('jwt-token');
    });

    it('should throw ConflictException if user already exists', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.inviteAdminUser(mockTeasoAdminSendRequest, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw UnauthorizedException if role is invalid', async () => {
      await expect(
        service.inviteAdminUser(mockTeasoAdminSendRequest, 3),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if trying to create super admin', async () => {
      const superAdminRequest = { ...mockTeasoAdminSendRequest, roleId: 1 };

      await expect(
        service.inviteAdminUser(superAdminRequest, 1),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyInviteToken', () => {
    const mockPayload = { userId: 1, email: 'test@example.com' };

    it('should verify invite token successfully', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.verifyInviteToken('valid-token');

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.userId },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyInviteToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.verifyInviteToken('valid-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user status is not PENDING', async () => {
      const approvedUser = { ...mockUser, status: 'APPROVED' };
      jwtService.verify.mockReturnValue(mockPayload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        approvedUser,
      );

      await expect(service.verifyInviteToken('valid-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('completeRegistration', () => {
    const mockPayload = { userId: 1, email: 'test@example.com' };

    beforeEach(() => {
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
    });

    it('should complete registration successfully', async () => {
      const updatedUser = { ...mockUser, status: 'APPROVED' };
      jwtService.verify.mockReturnValue(mockPayload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(updatedUser);
      (emailService.sendEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.completeRegistration(
        'valid-token',
        mockTeasoAdminSendRequest,
      );

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockPayload.userId },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        mockTeasoAdminSendRequest.password,
        10,
      );
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          first_name: mockTeasoAdminSendRequest.first_name,
          last_name: mockTeasoAdminSendRequest.last_name,
          phone_number: mockTeasoAdminSendRequest.phone_number,
          password: 'hashedPassword',
          status: 'APPROVED',
        },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.completeRegistration(
          'invalid-token',
          mockTeasoAdminSendRequest,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if user not found', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.completeRegistration('valid-token', mockTeasoAdminSendRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user status is not PENDING', async () => {
      const approvedUser = { ...mockUser, status: 'APPROVED' };
      jwtService.verify.mockReturnValue(mockPayload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        approvedUser,
      );

      await expect(
        service.completeRegistration('valid-token', mockTeasoAdminSendRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
