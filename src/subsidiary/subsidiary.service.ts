import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubsidiaryDto } from './dto';
import { UpdateCompanyDto } from 'src/company/dtos/update-company.dto';
import { CompanyStatus, RoleName } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubsidiaryService {
  constructor(
    private readonly prisma: PrismaService,
    private emailService: EmailService,

    readonly configService: ConfigService,
  ) {}

  async create(dto: CreateSubsidiaryDto) {
    const parent = await this.prisma.company.findUnique({
      where: { id: dto.parentCompanyId },
    });
    if (!parent) {
      throw new NotFoundException('Parent company not found');
    }

    let teamLead = await this.prisma.user.findUnique({
      where: {
        email: dto.teamLeadEmail,
      },
    });
    const role = await this.prisma.role.findUnique({
      where: { name: RoleName.company_esg_subadmin },
    });
    if (!role) {
      throw new NotFoundException('Role company_esg_subadmin not found');
    }

    if (!teamLead) {
      teamLead = await this.prisma.user.create({
        data: {
          email: dto.teamLeadEmail,
          first_name: '',
          last_name: '',
          status: 'pending',
          password: '',
          companyId: dto.parentCompanyId,
          roleId: role.id,
        },
      });
      await this.emailService.sendEmail(
        dto.teamLeadEmail,
        {
          link: `${this.configService.get('FRONTEND_URL')}/auth/signup`,
          company_name: parent.name,
          subsidiary_name: dto.name,
        },
        6,
      );
    } else {
      await this.emailService.sendEmail(
        dto.teamLeadEmail,
        {
          link: `${this.configService.get('FRONTEND_URL')}/auth/login`,
          company_name: parent.name,
          subsidiary_name: dto.name,
        },
        7,
      );
    }
    return this.prisma.company.create({
      data: {
        name: dto.name,
        parentCompanyId: dto.parentCompanyId,
        teamLeadId: teamLead.id,
        industry: dto.industry,
        registration_number: '',
        address: '',
        contact_email: '',
        website: '',
        contact_phone: '',
        company_logo_url: '',
        status: CompanyStatus.PENDING,
        sicsCode: '',
        isoCountryCode: '',
        created_by: 0,
        updated_by: 0,
      },
      include: { teamLead: true, parentCompany: true },
    });
  }

  async findAllByParentCompanyId(parentCompanyId: number) {
    return this.prisma.company.findMany({
      where: { parentCompanyId },
      include: { teamLead: true, parentCompany: true },
    });
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { teamLead: true, parentCompany: true },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async update(id: number, dto: UpdateCompanyDto) {
    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return this.prisma.company.delete({
      where: { id },
    });
  }
}
