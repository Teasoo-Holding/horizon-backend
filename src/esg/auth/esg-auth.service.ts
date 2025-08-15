import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserStatus, CompanyStatus, Company, RoleName } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { EsgSignupDto } from './dtos/esg-signup.dto';
import { isCompanyEmail } from 'src/utils/blacklist-emails';
import { EmailService } from 'src/email/email.service';
import { CompleteInviteSignupDto } from './dtos/complete-invite-signup.dto';

@Injectable()
export class EsgAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) { }

  async signup(dto: EsgSignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // if (!isCompanyEmail(dto.email)) {
    //   throw new BadRequestException(
    //     'Please register with your company email address, not a personal email.',
    //   );
    // }

    const existingCompany: Company | null = await this.prisma.company.findFirst(
      {
        where: { registration_number: dto.registration_number },
      },
    );

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

    const company: Company = await this.prisma.company.create({
      data: {
        name: dto.name,
        registration_number: dto.registration_number,
        sicsCode: dto.sicsCode || '010',
        industry: dto.industry,
        isoCountryCode: dto.isoCountryCode || 'NG',
        address: dto.address,
        country: dto.country || 'Nigeria',
        website: dto.website,
        contact_email: dto.contact_email,
        contact_phone: dto.contact_phone,
        status: CompanyStatus.pending,
        created_by: 0,
        updated_by: 0,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone_number: dto.phone_number,
        roleId: companyESGAdminRole.id,
        companyId: company.id,
        status: UserStatus.pending,
      },
    });

    await this.prisma.company.update({
      where: { id: company.id },
      data: { created_by: user.id, updated_by: user.id },
    });

    await this.emailService.sendEmail(
      dto.email,
      {
        firstName: dto.first_name,
        companyName: dto.name,
        approvalMessage:
          'Your ESG company is pending approval by our administrators.',
      },
      7,
    );

    return {
      message:
        'Registration successful. Your ESG company is pending approval by an administrator.',
      user,
      company,
    };
  }


  async completeSignupFromInvitation(token: string, dto: CompleteInviteSignupDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { role: true, company: true, department: true },
    });

    if (!invitation || invitation.status !== 'pending') {
      throw new BadRequestException('Invalid or expired invitation.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: invitation.email,
        password: hashedPassword,
        first_name: dto.first_name,
        last_name: dto.last_name,
        companyId: invitation.companyId,
        departmentId: invitation.departmentId,
        roleId: invitation.roleId,
        status: UserStatus.active,
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    return { message: 'Signup complete', user };
  }

}
