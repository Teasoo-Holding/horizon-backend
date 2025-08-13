import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: number, dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: {
        companyId,
        name: dto.name,
      },
    });
  }

  async findById(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    try {
      return await this.prisma.department.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        // Prisma record not found
        throw new NotFoundException('Department not found');
      }
      throw error;
    }
  }

  async delete(id: number) {
    try {
      return await this.prisma.department.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Department not found');
      }
      throw error;
    }
  }
}
