import { Test, TestingModule } from '@nestjs/testing';
import { SubsidiaryService } from './subsidiary.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('SubsidiaryService', () => {
  let service: SubsidiaryService;
  let prisma: jest.Mocked<PrismaService>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubsidiaryService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn(), create: jest.fn() },
            company: { findUnique: jest.fn() },
            subsidiary: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            refreshToken: { create: jest.fn() },
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://frontend.test'),
          },
        },
      ],
    }).compile();

    service = module.get<SubsidiaryService>(SubsidiaryService);
    prisma = module.get(PrismaService);
    emailService = module.get(EmailService);
  });

  describe('create', () => {
    it('should throw NotFoundException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.create({ name: 'Sub1', teamLead_email: 'lead@test.com' } as any, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if role not allowed', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 1,
        companyId: 1,
        first_name: 'John',
        role: { name: 'employee' },
      } as any);

      await expect(
        service.create({ name: 'Sub1', teamLead_email: 'lead@test.com' } as any, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create a subsidiary and send email if teamLead exists in same company', async () => {
      (prisma.user.findUnique as jest.Mock).mockImplementation((args: any) => {
        if (args.where.id === 1) {
          return Promise.resolve({
            id: 1,
            companyId: 1,
            first_name: 'John',
            role: { name: 'super_admin' },
          } as any);
        }
        if (args.where.email) {
          return Promise.resolve({
            id: 2,
            email: 'lead@test.com',
            companyId: 1,
          } as any);
        }
        return null;
      });

      (prisma.company.findUnique as jest.Mock).mockResolvedValueOnce({ id: 1, name: 'MainCo' } as any);
      (prisma.subsidiary.create as jest.Mock).mockResolvedValueOnce({ id: 10, name: 'Sub1' } as any);

      const result = await service.create(
        { name: 'Sub1', teamLead_email: 'lead@test.com' } as any,
        1,
      );

      expect(prisma.subsidiary.create).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(result).toEqual({ id: 10, name: 'Sub1' });
    });
  });

  describe('findAll', () => {
    it('should throw if user is not super_admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ role: { name: 'employee' } } as any);

      await expect(service.findAll(1)).rejects.toThrow(ForbiddenException);
    });

    it('should return subsidiaries if user is super_admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ role: { name: 'super_admin' } } as any);
      (prisma.subsidiary.findMany as jest.Mock).mockResolvedValueOnce([{ id: 1, name: 'Sub1' }]);

      const result = await service.findAll(1);

      expect(result).toEqual([{ id: 1, name: 'Sub1' }]);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      (prisma.subsidiary.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('should return a subsidiary if found', async () => {
      (prisma.subsidiary.findUnique as jest.Mock).mockResolvedValueOnce({ id: 1, name: 'Sub1' });

      const result = await service.findOne(1);

      expect(result).toEqual({ id: 1, name: 'Sub1' });
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException if user does not own subsidiary', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ companyId: 1 } as any);
      (prisma.subsidiary.findUnique as jest.Mock).mockResolvedValueOnce({ parentCompanyId: 2 } as any);

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should delete subsidiary if user owns it', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ companyId: 1 } as any);
      (prisma.subsidiary.findUnique as jest.Mock).mockResolvedValueOnce({ parentCompanyId: 1 } as any);
      (prisma.subsidiary.delete as jest.Mock).mockResolvedValueOnce({ id: 1, name: 'Sub1' } as any);

      const result = await service.remove(1, 1);

      expect(prisma.subsidiary.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ id: 1, name: 'Sub1' });
    });
  });
});
