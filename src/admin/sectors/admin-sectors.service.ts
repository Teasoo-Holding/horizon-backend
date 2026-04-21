import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSectorDto, UpdateSectorDto, CreateIndustryDto, UpdateIndustryDto } from './dto/sectors.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AdminSectorsService {
  constructor(private prisma: PrismaService) {}

  async createSector(dto: CreateSectorDto) {
    try {
      return await this.prisma.sector.create({
        data: dto,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Sector with name "${dto.name}" already exists.`);
      }
      throw error;
    }
  }

  async getSectors() {
    const sectors = await this.prisma.sector.findMany({
      include: {
        _count: {
          select: { industries: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    // Transform specifically to format expected by UI stats or return directly
    return sectors.map(sector => ({
      ...sector,
      stats: {
        totalIndustries: sector._count.industries,
        // Mock topics until module is implemented
        totalTopics: 0 
      }
    }));
  }

  async getSectorById(id: number) {
    const sector = await this.prisma.sector.findUnique({
      where: { id },
      include: {
        industries: true,
        _count: {
          select: { industries: true },
        },
      },
    });

    if (!sector) throw new NotFoundException('Sector not found');

    return {
      ...sector,
      stats: {
        totalIndustries: sector._count.industries,
        totalTopics: 0
      }
    };
  }

  async updateSector(id: number, dto: UpdateSectorDto) {
    try {
      return await this.prisma.sector.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Sector not found');
      }
      throw error;
    }
  }

  async deleteSector(id: number) {
    try {
      return await this.prisma.sector.delete({
        where: { id },
      });
    } catch (error) {
      // If there are industries attached to sector, it fails
      throw new ConflictException('Cannot delete a sector with attached industries.');
    }
  }

  // --- Industries Management ---

  async createIndustry(dto: CreateIndustryDto) {
    try {
      return await this.prisma.industry.create({
        data: dto,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Industry with name "${dto.name}" already exists in this sector.`);
      }
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new NotFoundException(`Sector with ID "${dto.sectorId}" not found.`);
      }
      throw error;
    }
  }

  async getIndustries() {
    const industries = await this.prisma.industry.findMany({
      include: {
        sector: {
          select: { id: true, name: true, sasbCode: true }
        },
        _count: {
          select: { companies: true, subsidiaries: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return industries.map(ind => ({
      ...ind,
      stats: {
        totalCompaniesUsing: ind._count.companies + ind._count.subsidiaries,
        topics: 0,
        subMetrics: 0,
      }
    }));
  }

  async getIndustryById(id: number) {
    const ind = await this.prisma.industry.findUnique({
      where: { id },
      include: {
        sector: {
          select: { id: true, name: true, sasbCode: true }
        },
        _count: {
          select: { companies: true, subsidiaries: true },
        },
      },
    });

    if (!ind) throw new NotFoundException('Industry not found');

    return {
      ...ind,
      stats: {
        totalCompaniesUsing: ind._count.companies + ind._count.subsidiaries,
        topics: 0,
        subMetrics: 0,
      }
    };
  }

  async updateIndustry(id: number, dto: UpdateIndustryDto) {
    try {
      return await this.prisma.industry.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Industry not found');
      }
      throw error;
    }
  }

  async deleteIndustry(id: number) {
    try {
      return await this.prisma.industry.delete({
        where: { id },
      });
    } catch (error) {
      throw new ConflictException('Cannot delete an industry with attached companies.');
    }
  }
}
