import { Test, TestingModule } from '@nestjs/testing';
import { EsgAuthService } from './esg-auth.service';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { PhoneValidationService } from 'src/config/phone-validation.service';
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
            user: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
            company: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
            role: { findUnique: jest.fn() },
            industry: { findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'Energy' }) },
            systemSetting: { findFirst: jest.fn().mockResolvedValue(null) },
            $transaction: jest.fn((cb) => cb({
              user: { create: jest.fn().mockResolvedValue({ id: 1, email: 'sadiq@btech.com', password: 'hashed', otpHash: 'otp-hash', otpExpiresAt: new Date() }), update: jest.fn() },
              company: { create: jest.fn().mockResolvedValue({ id: 1, name: 'BeelahTech Ltd.' }) },
            })),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
            sendRawEmail: jest.fn().mockResolvedValue({ success: true }),
            getTeamNotificationEmails: jest.fn().mockReturnValue(['team1@example.com', 'team2@example.com']),
          },
        },
        {
          provide: PhoneValidationService,
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
      (prisma.company.findUnique as jest.Mock).mockResolvedValue(null);
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

      expect(result).toMatchObject({
        message:
          'Registration successful. Your ESG company is pending approval by an administrator.',
      });
    })

      ;

    describe('team notification', () => {
      // Let the fire-and-forget notification settle
      const flush = () => new Promise((resolve) => setImmediate(resolve));

      beforeEach(() => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.company.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 1, name: 'company_esg_admin' });
      });

      it('emails every team inbox about the new registration', async () => {
        const emailService = (service as any).emailService;

        await service.signup(baseDto as any);
        await flush();

        expect(emailService.sendRawEmail).toHaveBeenCalledTimes(2);
        const [to, subject, html] = emailService.sendRawEmail.mock.calls[0];
        expect(to).toBe('team1@example.com');
        expect(subject).toBe('New registration: BeelahTech Ltd.');
        expect(html).toContain('sadiq@btech.com');
        expect(html).toContain('Energy');
      });

      it('alerts active super admins with the review email, not the verification template', async () => {
        (prisma.user.findMany as jest.Mock).mockResolvedValue([{ email: 'admin@example.com' }]);
        const emailService = (service as any).emailService;

        await service.signup(baseDto as any);
        await flush();

        const recipients = emailService.sendRawEmail.mock.calls.map((c: unknown[]) => c[0]);
        expect(recipients).toEqual(['admin@example.com', 'team1@example.com', 'team2@example.com']);
        expect(emailService.sendEmail).not.toHaveBeenCalledWith('admin@example.com', expect.anything(), 7);
      });

      it('never returns password or OTP hashes', async () => {
        const result = await service.signup(baseDto as any);

        expect(result.user).not.toHaveProperty('password');
        expect(result.user).not.toHaveProperty('otpHash');
        expect(result.user).not.toHaveProperty('otpExpiresAt');
        expect(result.user).toHaveProperty('email', 'sadiq@btech.com');
      });

      it('skips the team inboxes when disabled in admin settings', async () => {
        (prisma.systemSetting.findFirst as jest.Mock).mockResolvedValue({ notify_new_company_reg: false });
        const emailService = (service as any).emailService;

        await service.signup(baseDto as any);
        await flush();

        expect(emailService.sendRawEmail).not.toHaveBeenCalled();
      });

      it('still alerts super admins when the team setting is disabled', async () => {
        (prisma.systemSetting.findFirst as jest.Mock).mockResolvedValue({ notify_new_company_reg: false });
        (prisma.user.findMany as jest.Mock).mockResolvedValue([{ email: 'admin@example.com' }]);
        const emailService = (service as any).emailService;

        await service.signup(baseDto as any);
        await flush();

        expect(emailService.sendRawEmail).toHaveBeenCalledTimes(1);
        expect(emailService.sendRawEmail.mock.calls[0][0]).toBe('admin@example.com');
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: baseDto.email,
      });

      await expect(service.signup(baseDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if company with same name already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.company.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        name: baseDto.name,
      });

      await expect(service.signup(baseDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if ESG Admin role is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.company.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.signup(baseDto)).rejects.toThrow(ConflictException);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'company_esg_admin' },
      });
    });
  });
});
