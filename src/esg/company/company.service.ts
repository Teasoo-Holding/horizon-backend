import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { AdminUpdateCompanyDto } from './dtos/admin-update-company.dto';

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
  async update(id: number, dto: UpdateCompanyDto) {
    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }
  async adminUpdate(id: number, dto: AdminUpdateCompanyDto) {
    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }
}
