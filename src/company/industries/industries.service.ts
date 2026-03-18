import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class IndustriesService {
  constructor(private prisma: PrismaService) {}

  async getSectors() {
    const sectors = await this.prisma.sector.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    return sectors.map((s) => s.name);
  }

  async getIndustries() {
    return this.prisma.industry.findMany({
      include: { sector: true },
      orderBy: { name: 'asc' },
    });
  }

  async getIndustriesBySector(sector: string) {
    const industries = await this.prisma.industry.findMany({
      where: { sector: { name: { equals: sector, mode: 'insensitive' } } },
    });

    if (!industries.length) {
      throw new NotFoundException(`Sector "${sector}" not found`);
    }

    return industries;
  }
}
