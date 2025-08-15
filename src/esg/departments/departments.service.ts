import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(
    companyId: number,
    dto: CreateDepartmentDto & { leadId?: number },
    creatorEmail: string,
    creatorId: number
  ) {
    return this.prisma.department.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        contact_email: dto.contact_email || creatorEmail,
        leadId: dto.leadId ?? creatorId,
      },
      include: {
        lead: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });
  }


  async findById(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        lead: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    try {
      return await this.prisma.department.update({
        where: { id },
        data: dto,
        include: {
          lead: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Department not found');
      }
      throw error;
    }
  }

  async delete(id: number) {
    try {
      return await this.prisma.department.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Department not found');
      }
      throw error;
    }
  }

  async findAll(companyId: number) {
    return this.prisma.department.findMany({
      where: { companyId },
      include: {
        lead: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });
  }
}
