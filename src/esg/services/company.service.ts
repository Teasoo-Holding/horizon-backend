import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyDto } from '../dtos/company.dto';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async createCompany(userId: number, data: CreateCompanyDto) {
    const existingCompany = await this.prisma.company.findUnique({
      where: { company_name: data.companyName },
    });
    if (existingCompany) throw new ConflictException('Company already registered');

    const company = await this.prisma.company.create({
      data: {
        company_name: data.companyName,
        registration_number: data.registrationNumber,
        address: data.address,
        sustainability_manager_id: userId,
        status: 'PENDING',
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { company_id: company.id },
    });

    return company;
  }

  // Add more company-related methods here...
}
