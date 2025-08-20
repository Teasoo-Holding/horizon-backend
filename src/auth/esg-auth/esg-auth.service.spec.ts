import { Test, TestingModule } from '@nestjs/testing';
import { EsgAuthService } from './esg-auth.service';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyStatus, RoleName, UserStatus } from '@prisma/client';
import { EsgSignupDto } from './dtos/esg-signup.dto';
import { EmailService } from 'src/email/email.service';

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
              findMany: jest.fn(),
            },
            company: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            role: { findUnique: jest.fn() },
            $transaction: jest.fn(async (input: any) => {
              // Handle both array of operations and callback function
              if (Array.isArray(input)) {
                return Promise.all(input.map((op) => op()));
              } else if (typeof input === 'function') {
                // Prisma $transaction can also accept a callback
                return input({
                  user: prisma.user,
                  company: prisma.company,
                  role: prisma.role,
                });
              }
              throw new Error('Invalid $transaction input');
            }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendMail: jest.fn(),
            sendEmail: jest.fn(), // Add this line to mock sendEmail
          },
        },
      ],
    }).compile();

    service = module.get<EsgAuthService>(EsgAuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('signup()', () => {
    const baseDto: EsgSignupDto = {
      email: 'sadiq@btech.com', // Add email
      password: 'password123',
      first_name: 'Sadiq',
      last_name: 'Sambo',
      phone_number: '+2347012345678',
      role: RoleName.company_esg_admin, // Use enum
      name: 'BeelahTech Ltd.', // was company_name
      registration_number: 'RC123456',
      industry: 'Energy', // was industry_type
      address: '123 Green Street, Abuja, Nigeria',
      contact_email: 'info@btech.com',
      contact_phone: '+2348123456789',
      website: 'https://example.com', // was company_website
      isoCountryCode: 'NG', // new required field
    };

    it('should register a new ESG user and company successfully', async () => {
      const dto = { ...baseDto, email: 'sadiq@btech.com' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]); // <-- FIX
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        name: RoleName.company_esg_admin,
      });
      (prisma.company.create as jest.Mock).mockResolvedValue({
        id: 1,
        name: dto.name,
        status: CompanyStatus.PENDING,
      });
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 1,
        email: dto.email,
        roleId: 1,
        companyId: 1,
        status: UserStatus.pending,
      });

      const result = await service.signup(dto);

      expect(result).toMatchObject({
        message:
          'Registration successful. Your ESG company is pending approval by an administrator.',
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      const dto = { ...baseDto, email: 'sadiq@btech.com' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: dto.email,
      });
      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if company with registration number already exists', async () => {
      const dto = { ...baseDto, email: 'sadiq@btech.com' };
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      prisma.company.findFirst = jest.fn().mockResolvedValue({
        id: 1,
        registration_number: dto.registration_number,
      });
      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if ESG Admin role is not found', async () => {
      const dto = { ...baseDto, email: 'sadiq@btech.com' };
      prisma.user.findUnique = jest.fn().mockResolvedValue(null);
      prisma.company.findFirst = jest.fn().mockResolvedValue(null);
      prisma.role.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: RoleName.company_esg_admin },
      });
    });
  });
});
