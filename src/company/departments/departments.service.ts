import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { ActivitiesService } from 'src/activities/activities.service';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService,
    private readonly emailService: EmailService,
  ) { }

  async create(
    companyId: number,
    dto: CreateDepartmentDto,
    creatorEmail: string,
    creatorId: number,
  ) {
    let leadId = dto.leadId;

    if (dto.leadEmail) {
      const leadEmailLower = dto.leadEmail.toLowerCase();

      // 1. Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: leadEmailLower },
      });

      if (existingUser) {
        leadId = existingUser.id;
      } else {
        const pendingInvitation = await this.prisma.invitation.findFirst({
          where: { email: leadEmailLower, status: 'pending' },
        });

        if (pendingInvitation) {
          throw new BadRequestException(
            'A pending invitation already exists for this email.',
          );
        }

        const fullName = dto.leadName || '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const newLead = await this.prisma.user.create({
          data: {
            email: leadEmailLower,
            first_name: firstName,
            last_name: lastName,
            companyId,
            password: '',
            roleId: 2, // Default role for department leads
            status: 'pending',
          },
        });

        const company = await this.prisma.company.findUnique({
          where: { id: companyId },
          select: { name: true },
        });

        const creator = await this.prisma.user.findUnique({
          where: { id: creatorId },
          select: { first_name: true, last_name: true },
        });

        await this.emailService.sendEmail(
          newLead.email,
          {
            firstname: firstName || leadEmailLower,
            link: process.env.FRONTEND_URL + '/register',
            admin_name: creator ? `${creator.first_name} ${creator.last_name || ''}`.trim() : 'System',
            esg_name: company?.name || 'the company',
          },
          6,
        );
        leadId = newLead.id;
      }
    }

    let subsidiaryId: number | null = dto.subsidiaryId ?? null;
    if (!subsidiaryId && dto.subsidiaryName) {
      const subsidiary = await this.prisma.subsidiary.findFirst({
        where: { name: dto.subsidiaryName, parentCompanyId: companyId },
      });
      subsidiaryId = subsidiary?.id ?? null;
    }

    const department = await this.prisma.department.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        contact_email: dto.contact_email || creatorEmail,
        leadId: leadId ?? creatorId,
        subsidiaryId: subsidiaryId,
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
        subsidiary: {
          select: { id: true, name: true }
        }
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
        subsidiary: {
          select: { id: true, name: true }
        }
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
      const { subsidiaryName, leadEmail, leadName, ...rest } = dto;
      let subsidiaryId = dto.subsidiaryId;

      if (!subsidiaryId && subsidiaryName) {
        const current = await this.prisma.department.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Department not found');
        const subsidiary = await this.prisma.subsidiary.findFirst({
          where: { name: subsidiaryName, parentCompanyId: current.companyId },
        });
        subsidiaryId = subsidiary?.id;
      }

      let leadId = dto.leadId;
      if (dto.leadEmail) {
        const leadEmailLower = dto.leadEmail.toLowerCase();

        // 1. Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
          where: { email: leadEmailLower },
        });

        if (existingUser) {
          leadId = existingUser.id;
        } else {
          const pendingInvitation = await this.prisma.invitation.findFirst({
            where: { email: leadEmailLower, status: 'pending' },
          });

          if (pendingInvitation) {
            throw new BadRequestException(
              'A pending invitation already exists for this email.',
            );
          }

          const currentDept = await this.prisma.department.findUnique({ where: { id } });
          if (!currentDept) throw new NotFoundException('Department not found');

          const fullName = dto.leadName || '';
          const nameParts = fullName.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const newLead = await this.prisma.user.create({
            data: {
              email: leadEmailLower,
              first_name: firstName,
              last_name: lastName,
              companyId: currentDept.companyId,
              departmentId: id,
              subsidiaryId: subsidiaryId || currentDept.subsidiaryId, // Associate with the subsidiary
              password: '',
              roleId: 2,
              status: 'pending',
            },
          });

          const company = await this.prisma.company.findUnique({
            where: { id: currentDept.companyId },
            select: { name: true },
          });

          const updater = await this.prisma.user.findUnique({
            where: { id: updaterId },
            select: { first_name: true, last_name: true },
          });

          await this.emailService.sendEmail(
            newLead.email,
            {
              firstname: firstName || leadEmailLower,
              link: process.env.FRONTEND_URL + '/register',
              admin_name: updater ? `${updater.first_name} ${updater.last_name || ''}`.trim() : 'System',
              esg_name: company?.name || 'the company',
            },
            6,
          );
          leadId = newLead.id;
        }
      }

      const updated = await this.prisma.department.update({
        where: { id },
        data: {
          ...rest,
          ...(subsidiaryId && { subsidiaryId }),
          ...(leadId && { leadId }),
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
          subsidiary: {
            select: { id: true, name: true }
          }
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
        subsidiary: {
          select: { id: true, name: true },
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
