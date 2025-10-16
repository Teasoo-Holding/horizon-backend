import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { ActivitiesService } from 'src/activities/activities.service';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async create(
    companyId: number,
    dto: CreateDepartmentDto & { leadId?: number },
    creatorEmail: string,
    creatorId: number,
  ) {
    const department = await this.prisma.department.create({
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

    await this.activitiesService.logActivity({
      companyId,
      createdById: creatorId,
      title: `Created department "${department.name}"`,
      description: `(${creatorEmail}) created a new company department "${department.name}".`,
      type: 'department',
    });

    return department;
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

  async update(
    id: number,
    dto: UpdateDepartmentDto,
    updaterId: number,
    updaterEmail?: string,
  ) {
    try {
      const updated = await this.prisma.department.update({
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

      await this.activitiesService.logActivity({
        companyId: updated.companyId,
        createdById: updaterId,
        title: `Department "${updated.name}" updated`,
        description: `User (${updaterEmail ?? 'unknown'}) updated department "${updated.name}".`,
        type: 'department',
        status: 'updated',
      });

      return updated;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Department not found');
      }
      throw error;
    }
  }

  async delete(id: number, deleterId: number, deleterEmail?: string) {
    try {
      const deleted = await this.prisma.department.delete({ where: { id } });

      await this.activitiesService.logActivity({
        companyId: deleted.companyId,
        createdById: deleterId,
        title: `Department "${deleted.name}" deleted`,
        description: `User (${deleterEmail ?? 'unknown'}) deleted department "${deleted.name}".`,
        type: 'department',
        status: 'deleted',
      });

      return deleted;
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

  async getUsers(departmentId: number) {
    return this.prisma.user.findMany({
      where: { departmentId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        status: true,
        profile_photo_url: true,
      },
    });
  }
}
