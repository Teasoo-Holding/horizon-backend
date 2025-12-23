import { Test, TestingModule } from '@nestjs/testing';
import { EsgAuthService } from './esg-auth.service';
import { ConflictException } from '@nestjs/common';
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
            industry: { findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'Energy' }) },
          },
        },
        {
          provide: 'EmailService',
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: 'PhoneValidationService',
          useValue: {
            validatePhone: jest.fn().mockReturnValue(true),
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
      full_name: 'Sadiq Sambo',
      name: 'BeelahTech Ltd.',
      email: 'sadiq@btech.com',
      phone_number: '+2347012345678',
      role: 'company_esg_admin',
      company_name: 'BeelahTech Ltd.',
      registration_number: 'RC123456',
      industryId: 1,
      industry_type: 'Energy',
      address: '123 Green Street, Abuja, Nigeria',
      contact_email: 'info@btech.com',
      contact_phone: '+2348123456789',
      company_website: 'https://example.com',
    };

    it('should register a new ESG user and company successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'company_esg_admin',
      });
      (prisma.company.create as jest.Mock).mockResolvedValue({
        id: 1,
        name: baseDto.company_name,
      });
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 1,
        email: baseDto.email,
        role: RoleName.company_esg_admin,
      });

      const result = await service.signup(baseDto);

      expect(result).toEqual({
        message:
          'Registration successful. Your ESG company is pending approval by an administrator.',
      });
    })

      ;

    it('should throw ConflictException if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: baseDto.email,
      });

      await expect(service.signup(baseDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if company with registration number already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.company.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        registration_number: baseDto.registration_number,
      });

      await expect(service.signup(baseDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if ESG Admin role is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.signup(baseDto)).rejects.toThrow(ConflictException);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'company_esg_admin' },
      });
    });
  });
});
