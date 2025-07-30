import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto } from './dtos/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async createCompany(dto: CreateCompanyDto) {
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.company_name,
          registration_number: dto.registration_number,
          contact_email: dto.email,
          industry_type: dto.industry_type,
          address: dto.address,
          contact_phone: dto.contact_phone,
          status: 'PENDING',
          created_by: 0, // Temporary
          updated_by: 0, // Temporary
        },
      });

      await tx.user.create({
        data: {
          email: dto.email,
          password: dto.password, // Hash this in controller
          first_name: dto.first_name,
          last_name: dto.last_name,
          company_id: company.id,
          role: { connect: { name: 'SUSTAINABILITY_MANAGER' } },
          status: 'PENDING',
        },
      });

      return company;
    });
  }
}
