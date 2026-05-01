import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DEFAULT_TEAM_LEAD_ROLE, resolveRoleId } from 'src/auth/roles/role.constants';
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
    const leadEmail = dto.leadEmail?.toLowerCase();

    // 1. If leadId is provided, validate it (handle collisions/invitations)
    if (leadId) {
      const teamLead = await this.prisma.user.findUnique({
        where: { id: leadId },
      });

      if (!teamLead || teamLead.companyId !== companyId) {
        const invitation = await this.prisma.invitation.findUnique({
          where: { id: leadId },
        });

        if (invitation && invitation.companyId === companyId) {
          // Found a valid invitation, resolve by email
          const resolvedUser = await this.resolveLeadByEmail(
            companyId,
            invitation.email,
            dto.leadName,
            creatorId,
          );
          leadId = resolvedUser.id;
        } else if (teamLead) {
          throw new BadRequestException(
            'You can only assign team leads from your own company',
          );
        } else {
          throw new NotFoundException(
            `User or invitation with id ${leadId} not found`,
          );
        }
      }
    } else if (leadEmail) {
      const resolvedUser = await this.resolveLeadByEmail(
        companyId,
        leadEmail,
        dto.leadName,
        creatorId,
      );
      leadId = resolvedUser.id;
    }

    if (leadId) {
      // Ensure any pending invitations for the resolved lead are cancelled
      const leadUser = await this.prisma.user.findUnique({
        where: { id: leadId },
        select: { email: true },
      });
      if (leadUser) {
        await this.prisma.invitation.updateMany({
          where: { email: leadUser.email, status: 'pending' },
          data: { status: 'cancelled' },
        });
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

    // Assign the lead user to this department so they appear in team members
    if (department.leadId) {
      await this.prisma.user.update({
        where: { id: department.leadId },
        data: { departmentId: department.id },
      });
    }

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
      const { subsidiaryName, leadName, ...rest } = dto;
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
      const leadEmail = dto.leadEmail?.toLowerCase();

      const currentDept = await this.prisma.department.findUnique({ where: { id } });
      if (!currentDept) throw new NotFoundException('Department not found');

      // 1. If leadId is provided, validate it (handle collisions/invitations)
      if (leadId) {
        const teamLead = await this.prisma.user.findUnique({
          where: { id: leadId },
        });

        if (!teamLead || teamLead.companyId !== currentDept.companyId) {
          const invitation = await this.prisma.invitation.findUnique({
            where: { id: leadId },
          });

          if (invitation && invitation.companyId === currentDept.companyId) {
            // Found a valid invitation, resolve by email
            const resolvedUser = await this.resolveLeadByEmail(
              currentDept.companyId,
              invitation.email,
              dto.leadName,
              updaterId,
              id, // departmentId
              subsidiaryId,
            );
            leadId = resolvedUser.id;
          } else if (teamLead) {
            throw new BadRequestException(
              'You can only assign team leads from your own company',
            );
          } else {
            throw new NotFoundException(
              `User or invitation with id ${leadId} not found`,
            );
          }
        }
      } else if (leadEmail) {
        const resolvedUser = await this.resolveLeadByEmail(
          currentDept.companyId,
          leadEmail,
          dto.leadName,
          updaterId,
          id, // departmentId
          subsidiaryId,
        );
        leadId = resolvedUser.id;
      }

      if (leadId) {
        // Ensure any pending invitations for the resolved lead are cancelled
        const leadUser = await this.prisma.user.findUnique({
          where: { id: leadId },
          select: { email: true },
        });
        if (leadUser) {
          await this.prisma.invitation.updateMany({
            where: { email: leadUser.email, status: 'pending' },
            data: { status: 'cancelled' },
          });
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
    const departments = await this.prisma.department.findMany({
      where: { companyId },
      include: {
        lead: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        subsidiary: {
          select: { id: true, name: true },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return departments.map((dept) => ({
      ...dept,
      teamSize: dept._count.users,
    }));
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

  private async resolveLeadByEmail(
    companyId: number,
    email: string,
    name?: string,
    creatorId?: number,
    departmentId?: number,
    subsidiaryId?: number,
  ) {
    const emailLower = email.toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (user) {
      if (user.companyId && user.companyId !== companyId) {
        throw new BadRequestException(
          'User already belongs to a different company',
        );
      }
      // Update companyId/departmentId if not set
      if (!user.companyId || !user.departmentId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            companyId: user.companyId || companyId,
            departmentId: user.departmentId || departmentId,
            subsidiaryId: user.subsidiaryId || subsidiaryId,
          },
        });
      }
    } else {
      const fullName = name || '';
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      user = await this.prisma.user.create({
        data: {
          email: emailLower,
          first_name: firstName,
          last_name: lastName,
          companyId,
          departmentId,
          subsidiaryId,
          password: '',
          roleId: await resolveRoleId(this.prisma, DEFAULT_TEAM_LEAD_ROLE),
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
        user.email,
        {
          firstname: firstName || emailLower,
          link: (process.env.FRONTEND_URL || 'http://localhost:3000') + '/register',
          admin_name: creator ? `${creator.first_name} ${creator.last_name || ''}`.trim() : 'System',
          esg_name: company?.name || 'the company',
        },
        6,
      );
    }

    // Cancel any pending invitations for this email
    await this.prisma.invitation.updateMany({
      where: { email: emailLower, status: 'pending' },
      data: { status: 'cancelled' },
    });

    return user;
  }
}
