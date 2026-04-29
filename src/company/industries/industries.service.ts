import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class IndustriesService {
  constructor(private prisma: PrismaService) {}

  async getSectors() {
    return this.prisma.sector.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getIndustries() {
    return this.prisma.industry.findMany({
      include: { sector: true },
      orderBy: { name: 'asc' },
    });
  }

  async getIndustriesBySector(sectorId: number) {
    const industries = await this.prisma.industry.findMany({
      where: { sectorId },
      include: { sector: true },
      orderBy: { name: 'asc' },
    });

    if (!industries.length) {
      throw new NotFoundException(`Sector with ID ${sectorId} not found or has no industries`);
    }

    return industries;
  }
}
