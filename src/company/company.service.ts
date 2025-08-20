import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { CompanyStatus, RoleName, UserStatus } from '@prisma/client';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}
  async findAll() {
    return this.prisma.company.findMany();
  }
  async findById(id: number) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }
  async updateStatus(id: number, status: CompanyStatus) {
    console.log("Role:", RoleName.company_esg_admin);
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: { name: RoleName.company_esg_subadmin } },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.status === status) {
      return {
        message: `No change — company is already ${status}`,
        company,
      };
    }

    await this.prisma.company.update({
      where: { id },
      data: { status },
    });

    if (status === CompanyStatus.ACTIVE) {
      const esgAdmin = company.users[0];

      if (esgAdmin) {
        await this.prisma.user.update({
          where: { id: esgAdmin.id },
          data: { status: UserStatus.active },
        });

        const link = `${process.env.FRONTEND_URL}`;
        await this.emailService.sendEmail(
          esgAdmin.email,
          {
            firstName: esgAdmin.first_name,
            link,
          },
          5,
        );
      }
    }

    return {
      message: `Company status updated to ${status}`,
    };
  }

  async update(
    id: number,
    dto: Partial<UpdateCompanyDto> & { updated_by: number },
  ) {
    try {
      return await this.prisma.company.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Company not found');
      }
      throw error;
    }
  }
}
