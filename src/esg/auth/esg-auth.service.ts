import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  UserStatus,
  CompanyStatus,
  Company,
  AccessLevels,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { EsgSignupDto } from './dtos/esg-signup.dto';
import { DEFAULT_ROLES } from 'src/utils/default-roles';
import { isCompanyEmail } from 'src/utils/blacklist-emails';

@Injectable()
export class EsgAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signup(dto: EsgSignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (!isCompanyEmail(dto.email)) {
      throw new BadRequestException(
        'Please register with your company email address, not a personal email.',
      );
    }

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

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const sustainabilityManagerRole = await this.prisma.role.findUnique({
      where: { name: DEFAULT_ROLES.SUSTAINABILITY_MANAGER },
    });

    if (!sustainabilityManagerRole) {
      throw new ConflictException(
        'Sustainability Manager role is not configured',
      );
    }

    const company: Company = await this.prisma.company.create({
      data: {
        name: dto.company_name,
        registration_number: dto.registration_number,
        industry_type: dto.industry_type,
        address: dto.address,
        contact_email: dto.contact_email,
        contact_phone: dto.contact_phone,
        website: dto.company_website,
        status: CompanyStatus.PENDING,
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
        roleId: sustainabilityManagerRole.id,
        companyId: company.id,
        status: UserStatus.PENDING,
        accessLevel: AccessLevels.ESG_ADMIN,
      },
    });

    await this.prisma.company.update({
      where: { id: company.id },
      data: { created_by: user.id, updated_by: user.id },
    });

    return {
      message:
        'Registration successful. Your ESG company is pending approval by an administrator.',
      user,
      company,
    };
  }
}
