import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { CompanyStatus } from '@prisma/client';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll() {
    return this.prisma.company.findMany();
  }
  async findById(id: number) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }
  async updateStatus(id: number, status: CompanyStatus) {
    return await this.prisma.company.update({
      where: { id },
      data: { status },
    });
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
