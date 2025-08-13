import { Test, TestingModule } from '@nestjs/testing';
import { EsgAuthService } from './esg-auth.service';
import { ConflictException, BadRequestException } from '@nestjs/common';
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

    // it('should register a new ESG user and company successfully', async () => {
    //   const dto = { ...baseDto, email: 'sadiq@btech.com' };

    //   (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    //   (prisma.company.findFirst as jest.Mock).mockResolvedValue(null);
    //   jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
    //   (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 1, name: 'SUSTAINABILITY_MANAGER' });
    //   (prisma.user.create as jest.Mock)({ id: 1, name: dto.company_name });
    //  (prisma.user.create as jest.Mock)({ id: 1, email: dto.email, accessLevel: AccessLevels.ESG_ADMIN });

    //   const result = await service.signup(dto);

    //   expect(result).toEqual(
    //     expect.objectContaining({
    //       message: expect.any(String),
    //       user: expect.any(Object),
    //       company: expect.any(Object),
    //     }),
    //   );
    // });

    // src/esg/auth/esg-auth.service.spec.ts
it('should register a new ESG user and company successfully', async () => {
  const dto = { ...baseDto, email: 'sadiq@btech.com' };
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.company.findFirst as jest.Mock).mockResolvedValue(null);
  jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
  (prisma.role.findUnique as jest.Mock).mockResolvedValue({ 
    id: 1, 
    name: 'SUSTAINABILITY_MANAGER' 
  });
  
  // Add mock company creation
  (prisma.company.create as jest.Mock).mockResolvedValue({ 
    id: 1, 
    name: dto.company_name 
  });
  
  // Add mock user creation
  (prisma.user.create as jest.Mock).mockResolvedValue({ 
    id: 1, 
    email: dto.email, 
    accessLevel: AccessLevels.ESG_ADMIN 
  });
  
  const result = await service.signup(dto);
  expect(result).toEqual(
    expect.objectContaining({
      message: expect.any(String),
      user: expect.any(Object),
      company: expect.any(Object),
    }),
  );
});
    it('should throw BadRequestException for personal email', async () => {
      const dto = { ...baseDto, email: 'sadiqasg@gmail.com' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.signup(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user already exists', async () => {
      const dto = { ...baseDto, email: 'sadiq@btech.com' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, email: dto.email });

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if company already exists', async () => {
      const dto = { ...baseDto, email: 'sadiq@btech.com' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.company.findFirst as jest.Mock).mockResolvedValue({ id: 1, registration_number: dto.registration_number });

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if role is missing', async () => {
      const dto = { ...baseDto, email: 'sadiq@btech.com' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.company.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });
  });
});
