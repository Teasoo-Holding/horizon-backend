import { Test, TestingModule } from '@nestjs/testing';
import { EsgAuthService } from './esg-auth.service';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoleNames } from '@prisma/client';

describe('EsgAuthService', () => {
  let service: EsgAuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EsgAuthService, PrismaService],
    }).compile();

    service = module.get<EsgAuthService>(EsgAuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('register()', () => {
    const dto = {
      email: 'sadiqasg@gmail.com',
      password: 'password123',
      first_name: 'Sadiq',
      last_name: 'Sambo',
      phone_number: '+2347012345678',
      role: RoleNames.SUSTAINABILITY_MANAGER,
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

      prisma.user.create = jest
        .fn()
        .mockResolvedValue({ id: 1, email: dto.email });

      prisma.role.findUnique = jest.fn().mockResolvedValue({ id: 1 });
      prisma.company.create = jest
        .fn()
        .mockResolvedValue({ id: 1, name: dto.company_name });

      const result = await service.signup(dto);

      expect(result).toEqual({
        message:
          'Registration successful. Your ESG company is pending approval by an administrator.',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.any(Object) }),
      );
      expect(prisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.any(Object) }),
      );
    });

    it('should throw a ConflictException if email already exists', async () => {
      prisma.user.findUnique = jest
        .fn()
        .mockResolvedValue({ id: 1, email: dto.email });

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });
  });
});
