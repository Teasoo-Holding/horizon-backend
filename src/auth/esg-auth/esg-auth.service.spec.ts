import { Test, TestingModule } from '@nestjs/testing';
import { EsgAuthService } from './esg-auth.service';
import { ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyStatus, RoleName } from '@prisma/client';

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
            user: { findUnique: jest.fn(), create: jest.fn() },
            company: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
            role: { findUnique: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<EsgAuthService>(EsgAuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('signup()', () => {
    const baseDto = {
      password: 'password123',
      first_name: 'Sadiq',
      last_name: 'Sambo',
      email: 'sadiq@btech.com',
      phone_number: '+2347012345678',
      role: 'company_esg_admin',
      company_name: 'BeelahTech Ltd.',
      registration_number: 'RC123456',
      industry_type: 'Energy',
      address: '123 Green Street, Abuja, Nigeria',
      contact_email: 'info@btech.com',
      contact_phone: '+2348123456789',
      company_website: 'https://example.com',
    };

    // it('should register a new ESG user and company successfully', async () => {
    //   const dto = { ...baseDto, email: 'sadiq@btech.com' };

    //   (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    //   (prisma.company.findFirst as jest.Mock).mockResolvedValue(null);
    //   jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
    //   (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 1, name: 'SUSTAINABILITY_MANAGER' });
    //   (prisma.user.create as jest.Mock)({ id: 1, name: dto.company_name });
    //  (prisma.user.create as jest.Mock)({ id: 1, email: dto.email, accessLevel: AccessLevels.ESG_ADMIN });

      prisma.role.findUnique = jest.fn().mockResolvedValue({
        id: 1,
        name: 'company_esg_admin',
      });

    //   expect(result).toEqual(
    //     expect.objectContaining({
    //       message: expect.any(String),
    //       user: expect.any(Object),
    //       company: expect.any(Object),
    //     }),
    //   );
    // });

      prisma.user.create = jest.fn().mockResolvedValue({
        id: 1,
        email: baseDto.email,
        role: RoleName.company_esg_admin
      });

      const result = await service.signup(baseDto);

      expect(result).toEqual({
        message:
          'Registration successful. Your ESG company is pending approval by an administrator.',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(prisma.company.findFirst).toHaveBeenCalledWith();
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'company_esg_admin' },
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
            role: RoleName.company_esg_admin,
            status: CompanyStatus.pending
          }),
        }),
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      const dto = { ...baseDto, email: 'sadiq@btech.com' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, email: dto.email });

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if company with registration number already exists', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      prisma.company.findFirst = jest.fn().mockResolvedValue({
        id: 1,
        registration_number: dto.registration_number,
      });

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if ESG Admin role is not found', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      prisma.company.findFirst = jest.fn().mockResolvedValue(null);
      prisma.role.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'company_esg_admin' },
      });
    });
  });
});
