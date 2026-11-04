import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  UserStatus,
  CompanyStatus,
  RoleName,
  CompanyType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { EsgSignupDto } from './dtos/esg-signup.dto';
import { EmailService } from 'src/email/email.service';
import { CompleteSignupDto } from './dtos/complete-signup.dto';
import { PhoneValidationService } from 'src/config/phone-validation.service';

@Injectable()
export class EsgAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly phoneValidationService: PhoneValidationService,
  ) {}

  async checkEmailExists(email: string): Promise<{ exists: boolean }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    return { exists: !!existingUser };
  }

  async signup(dto: EsgSignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const existingCompanyByName = await this.prisma.company.findUnique({
      where: { name: dto.name },
    });
    if (existingCompanyByName) {
      throw new ConflictException('Company with this name already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const companyESGAdminRole = await this.prisma.role.findUnique({
      where: { name: RoleName.company_esg_admin },
    });
    if (!companyESGAdminRole) {
      throw new ConflictException('Company ESG Admin role is not configured');
    }

    const nameParts = dto.full_name.split(' ');
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';

    const [company, user] = await this.prisma.$transaction(async (prisma) => {
      const createdUser = await prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          first_name: first_name,
          last_name: last_name,
          phone_number: '',
          roleId: companyESGAdminRole.id,
          status: UserStatus.pending,
        },
      });

      const companyData: Prisma.CompanyUncheckedCreateInput = {
        name: dto.name,
        industryId: dto.industryId,
        status: CompanyStatus.pending,
        company_type: CompanyType.esg,
        isoCountryCode: '',
        address: '',
        contact_email: '',
        contact_phone: '',
        created_by: createdUser.id,
        updated_by: createdUser.id,
      };

      const createdCompany = await prisma.company.create({
        data: companyData,
      });

      await prisma.user.update({
        where: { id: createdUser.id },
        data: {
          companyId: createdCompany.id,
        },
      });

      return [createdCompany, createdUser];
    });

    await this.emailService.sendEmail(
      dto.email,
      {
        firstname: first_name,
      },
      4,
    );

    const superAdmins = await this.prisma.user.findMany({
      where: {
        role: {
          name: 'super_admin',
        },
        status: UserStatus.active,
      },
    });

    const companyDetailsLink = `${process.env.FRONTEND_URL}/admin/companies/${company?.id}`;

    for (const admin of superAdmins) {
      await this.emailService.sendEmail(
        admin.email,
        {
          firstname: admin.first_name,
          company_name: company?.name ?? 'New Company',
          link: companyDetailsLink,
        },
        7,
      );
    }

    // Best-effort: never delay or fail the signup
    this.notifyTeamOfSignup(user, company, dto).catch((err) =>
      console.error('Failed to send new registration notification:', err),
    );

    return {
      message:
        'Registration successful. Your ESG company is pending approval by an administrator.',
      user,
      company,
    };
  }

  /** Email the team inboxes about a new company registration, if enabled in admin settings. */
  private async notifyTeamOfSignup(
    user: { first_name: string | null; last_name: string | null; email: string },
    company: { id: string | number; name: string },
    dto: EsgSignupDto,
  ) {
    const settings = await this.prisma.systemSetting.findFirst();
    if (settings && !settings.notify_new_company_reg) return;

    const industry = dto.industryId
      ? await this.prisma.industry.findUnique({ where: { id: dto.industryId } })
      : null;
    const adminLink = `${process.env.FRONTEND_URL}/admin/companies/${company.id}`;
    const rows: [string, string][] = [
      ['Name', `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()],
      ['Email', user.email],
      ['Company', company.name],
      ['Industry', industry?.name ?? '—'],
      ['Registered', new Date().toUTCString()],
    ];
    const html = `
      <p>A new company has registered on ESG Horizon and is pending approval.</p>
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows.map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${escapeHtml(v)}</td></tr>`).join('')}
      </table>
      <p><a href="${escapeHtml(adminLink)}">Review the company in the admin dashboard</a></p>`;

    const subject = `New registration: ${company.name}`;
    const results = await Promise.all(
      this.emailService
        .getTeamNotificationEmails()
        .map((to) => this.emailService.sendRawEmail(to, subject, html)),
    );
    results.forEach((r, i) => {
      if (!r.success) console.error(`Registration notification failed (#${i + 1}):`, r.error);
    });
  }

  async completeSignup(dto: CompleteSignupDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
      include: { role: true, company: true, department: true },
    });

    if (!invitation) throw new BadRequestException('Invalid invitation token');
    if (invitation.expiresAt < new Date())
      throw new BadRequestException('Invitation expired');
    if (invitation.status !== 'pending')
      throw new UnauthorizedException('Invitation already used or expired');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: invitation.email,
        password: hashedPassword,
        first_name: dto.first_name,
        last_name: dto.last_name,
        roleId: invitation.roleId,
        companyId: invitation.companyId,
        departmentId: invitation.departmentId,
        status: 'active',
        profile_photo_url: null,
        last_login: new Date(Date.now()),
        otpHash: null,
        otpExpiresAt: null,
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    return user;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
