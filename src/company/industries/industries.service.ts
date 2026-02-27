import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class IndustriesService {
  constructor(private prisma: PrismaService) {}

  async getSectors() {
    const sectors = await this.prisma.industry.findMany({
      distinct: ['sector'],
      select: { sector: true },
      orderBy: { sector: 'asc' },
    });

    return sectors.map((s) => s.sector);
  }

  async getIndustries() {
    return this.prisma.industry.findMany({
      where: {sector: {equals: "Extractives and Minerals Processing"}},
      orderBy: { industry: 'asc' },
    });
  }

  async getIndustriesBySector(sector: string) {
    const industries = await this.prisma.industry.findMany({
      where: { sector: { equals: sector, mode: 'insensitive' } },
    });

    if (!industries.length) {
      throw new NotFoundException(`Sector "${sector}" not found`);
    }

    return industries;
  }
}
