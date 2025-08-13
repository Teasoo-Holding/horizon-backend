import { Test, TestingModule } from '@nestjs/testing';
import { EsgAuthService } from './esg-auth.service';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { DEFAULT_ROLES } from 'src/utils/default-roles';
import { AccessLevels } from '@prisma/client';

describe('EsgAuthService', () => {
  let service: EsgAuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EsgAuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            company: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            role: {
              findUnique: jest.fn(),
            },
            // Removed permission and userPermission mocks as per updated schema
          },
        },
      ],
    }).compile();

    service = module.get<EsgAuthService>(EsgAuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('signup()', () => {
    const dto = {
      email: 'sadiqasg@gmail.com',
      password: 'password123',
      first_name: 'Sadiq',
      last_name: 'Sambo',
      phone_number: '+2347012345678',
      role: DEFAULT_ROLES.SUSTAINABILITY_MANAGER,
      accessLevel: AccessLevels.ESG_ADMIN,
      company_name: 'BeelahTech Ltd.',
      registration_number: 'RC123456',
      industry_type: 'Energy',
      address: '123 Green Street, Abuja, Nigeria',
      contact_email: 'info@btech.com',
      contact_phone: '+2348123456789',
      company_website: 'https://example.com',
    };

    it('should register a new ESG user and company successfully', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      prisma.company.findFirst = jest.fn().mockResolvedValue(null);

      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);

      prisma.role.findUnique = jest.fn().mockResolvedValue({
        id: 1,
        name: 'SUSTAINABILITY_MANAGER',
      });

      prisma.company.create = jest.fn().mockResolvedValue({
        id: 1,
        name: dto.company_name,
      });

      prisma.user.create = jest.fn().mockResolvedValue({
        id: 1,
        email: dto.email,
        accessLevel: AccessLevels.ESG_ADMIN
      });

      const result = await service.signup(dto);

      expect(result).toEqual({
        message:
          'Registration successful. Your ESG company is pending approval by an administrator.',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(prisma.company.findFirst).toHaveBeenCalledWith();
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'SUSTAINABILITY_MANAGER' },
      });
      expect(prisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.any(Object) }),
      );
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            roleId: 1,
            companyId: 1,
            accessLevel: AccessLevels.ESG_ADMIN,
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should throw ConflictException if a user with the given email already exists', async () => {
      prisma.user.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 1, email: dto.email });

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
    });

    it('should throw ConflictException if company with registration number already exists', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      prisma.company.findFirst = jest
        .fn()
        .mockResolvedValue({
          id: 1,
          registration_number: dto.registration_number,
        });

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);

      expect(prisma.company.findFirst).toHaveBeenCalledWith({
        where: { registration_number: dto.registration_number },
      });
    });

    it('should throw ConflictException if SUSTAINABILITY_MANAGER role is not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      prisma.company.findFirst = jest.fn().mockResolvedValue(null);
      prisma.role.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'SUSTAINABILITY_MANAGER' },
      });
    });
  });
});
