import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserStatus, CompanyStatus, RoleName } from '@prisma/client';
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
    const isValid = this.phoneValidationService.validatePhoneNumber(
      dto.contact_phone,
      dto.isoCountryCode || 'NG',
    );

    if (!isValid) {
      throw new BadRequestException('Invalid phone number');
    }

    const formattedPhone = this.phoneValidationService.formatPhoneNumber(
      dto.contact_phone,
      dto.isoCountryCode || 'NG',
    );

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    const existingCompany = await this.prisma.company.findFirst({
      where: { registration_number: dto.registration_number },
    });
    if (existingCompany) {
      throw new ConflictException(
        'Company with this registration number already exists',
      );
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

    const [company, user] = await this.prisma.$transaction(async (prisma) => {
      const createdCompany = await prisma.company.create({
        data: {
          name: dto.name,
          registration_number: dto.registration_number,
          industry: {
            connect: { id: dto.industryId },
          },
          isoCountryCode: dto.isoCountryCode || 'NG',
          address: dto.address,
          country: dto.country || 'Nigeria',
          website: dto.website,
          contact_email: dto.contact_email,
          contact_phone: formattedPhone || '',
          status: CompanyStatus.pending,
          created_by: 0,
          updated_by: 0,
        },
      });

      const createdUser = await prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          first_name: dto.first_name,
          last_name: dto.last_name,
          phone_number: dto.phone_number,
          roleId: companyESGAdminRole.id,
          companyId: createdCompany.id,
          status: UserStatus.pending,
        },
      });

      await prisma.company.update({
        where: { id: createdCompany.id },
        data: {
          created_by: createdUser.id,
          updated_by: createdUser.id,
        },
      });

      const updatedCompany = await prisma.company.findUnique({
        where: { id: createdCompany.id },
      });

      return [updatedCompany, createdUser];
    });

    await this.emailService.sendEmail(
      dto.email,
      {
        firstname: dto.first_name,
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

    return {
      message:
        'Registration successful. Your ESG company is pending approval by an administrator.',
      user,
      company,
    };
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
