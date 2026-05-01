import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { isPlatformRole, DEFAULT_TEAM_LEAD_ROLE, resolveRoleId } from 'src/auth/roles/role.constants';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ActivitiesService } from 'src/activities/activities.service';

@Injectable()
export class SubsidiaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly activitiesService: ActivitiesService,
  ) { }

  async create(createSubsidiaryDto: CreateSubsidiaryDto, user_id: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: user_id },
        select: {
          id: true,
          email: true,
          companyId: true,
          first_name: true,
          role: { select: { name: true } },
        },
      });

      if (!user) {
        throw new NotFoundException(`User with id ${user_id} not found`);
      }

      const company = await this.prisma.company.findUnique({
        where: { id: user.companyId ?? 0 },
        select: { id: true, name: true },
      });

      if (
        !['company_esg_admin', 'company_esg_subadmin', 'super_admin'].includes(
          user.role.name,
        )
      ) {
        throw new ForbiddenException(
          'You are not authorized to create a subsidiary',
        );
      }

      let teamLead;

      // CASE 1: leadId was provided (user selected from dropdown)
      if (createSubsidiaryDto.leadId) {
        teamLead = await this.prisma.user.findUnique({
          where: { id: createSubsidiaryDto.leadId },
        });

        // If user not found OR belongs to another company (ID collision), check invitation table
        if (!teamLead || teamLead.companyId !== user.companyId) {
          const invitation = await this.prisma.invitation.findUnique({
            where: { id: createSubsidiaryDto.leadId },
          });

          if (invitation && invitation.companyId === user.companyId) {
            // Found a valid invitation, resolve by email
            createSubsidiaryDto.teamLead_email = invitation.email;
          } else if (teamLead) {
            // It was a user from another company and no valid invitation found
            throw new ForbiddenException(
              'You can only assign team leads from your own company',
            );
          } else {
            throw new NotFoundException(
              `User or invitation with id ${createSubsidiaryDto.leadId} not found`,
            );
          }
        }
      }

      // CASE 2: teamLead_email was provided (or resolved from invitation above)
      if (createSubsidiaryDto.teamLead_email) {
        const leadEmail = createSubsidiaryDto.teamLead_email.toLowerCase();
        teamLead = await this.prisma.user.findUnique({
          where: { email: leadEmail },
        });

        if (!teamLead) {
          teamLead = await this.prisma.user.create({
            data: {
              email: leadEmail,
              first_name: createSubsidiaryDto?.teamLead_name ?? '',
              companyId: user.companyId,
              password: '',
              roleId: await resolveRoleId(this.prisma, DEFAULT_TEAM_LEAD_ROLE),
              status: 'pending',
            },
          });

          await this.emailService.sendEmail(
            teamLead.email,
            {
              firstname: createSubsidiaryDto?.teamLead_name || leadEmail,
              link: this.configService.get('FRONTEND_URL') + '/register',
              admin_name: user.first_name,
              esg_name: company?.name,
            },
            6,
          );
        } else if (teamLead.companyId !== user.companyId) {
          throw new ForbiddenException(
            'You can only create subsidiaries with your own team lead',
          );
        }

        // Gracious handling: Cancel any pending invitations for this email
        await this.prisma.invitation.updateMany({
          where: { email: leadEmail, status: 'pending' },
          data: { status: 'cancelled' },
        });
      }
      // CASE 3: No teamLead provided → use current user as teamLead
      else if (!teamLead) {
        teamLead = user;
      }



      try {
        console.log('ind', createSubsidiaryDto.industryId);
        const subsidiary = await this.prisma.subsidiary.create({
          data: {
            name: createSubsidiaryDto.name,
            industryId:
              createSubsidiaryDto.industryId ?? null,
            parentCompanyId: user.companyId as number,
            created_by: user.id,
            updated_by: user.id,
            teamLeadId: teamLead.id,
            registration_number: createSubsidiaryDto.registration_number,
            sicsCode: createSubsidiaryDto.sicsCode,
            isinCode: createSubsidiaryDto.isinCode,
            isoCountryCode: createSubsidiaryDto.isoCountryCode,
            address: createSubsidiaryDto.address,
            country: createSubsidiaryDto.country,
            currency: createSubsidiaryDto.currency,
            contact_email: createSubsidiaryDto.contact_email,
            website: createSubsidiaryDto.website,
            contact_phone: createSubsidiaryDto.contact_phone,
            company_logo_url: createSubsidiaryDto.company_logo_url,
          },
          include: {
            industry: { select: { id: true, name: true, code: true, sector: { select: { id: true, name: true } } } },
            teamLead: {
              select: { first_name: true, last_name: true, email: true },
            },
          },
        });

        // Notify teamLead (whether new user or current user)
        await this.emailService.sendEmail(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          teamLead.email,
          {
            first_name: teamLead?.first_name,
            admin_name: user.first_name,
            esg_name: company?.name,
            subsidiary_name: createSubsidiaryDto.name,
          },
          10,
        );

        await this.activitiesService.logActivity({
          companyId: company?.id,
          createdById: user.id,
          title: `Created subsidiary "${subsidiary.name}"`,
          description: `${teamLead?.first_name} added a new subsidiary`,
          type: 'subsidiary',
        });

        return subsidiary;
      } catch (error) {
        if (
          error instanceof PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'A subsidiary with this name already exists for this company.',
          );
        }
        throw error;
      }
    } catch (error) {
      console.error('Error creating subsidiary:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Error creating subsidiary');
    }
  }

  async findAll(user_id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      include: {
        role: true,
      },
    });

    if (!user?.role?.name || !isPlatformRole(user.role.name)) {
      throw new ForbiddenException(
        'You are not authorized to view all subsidiaries',
      );
    }

    return await this.prisma.subsidiary.findMany();
  }

  async findCompanySubsidiaries(user_id: number) {
    return await this.prisma.subsidiary.findMany({
      where: {
        parentCompany: {
          users: {
            some: {
              id: user_id,
            },
          },
        },
      },
      include: {
        industry: { select: { id: true, name: true, code: true, sector: { select: { id: true, name: true } } } },
        teamLead: {
          select: { first_name: true, last_name: true, email: true },
        },
        parentCompany: true,
      },
      orderBy: {
        created_at: 'desc',
      }
    });
  }

  async findSubsidiaryUsers(id: number) {
    const subsidiary = await this.prisma.subsidiary.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            status: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!subsidiary) {
      throw new NotFoundException(`Subsidiary with ID #${id} not found`);
    }

    return subsidiary.users;
  }

  async findOne(id: number) {
    const subsidiary = await this.prisma.subsidiary.findUnique({
      where: { id },
      include: {
        industry: { select: { id: true, name: true, code: true, sector: { select: { id: true, name: true } } } },
        teamLead: {
          select: { first_name: true, last_name: true, email: true },
        },
      },
    });
    if (!subsidiary) {
      throw new NotFoundException('Subsidiary not found');
    }
    return subsidiary;
  }

  async update(
    id: number,
    updateSubsidiaryDto: UpdateSubsidiaryDto,
    user_id: number,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: user_id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${user_id} not found`);
      }

      const existingSubsidiary = await this.prisma.subsidiary.findUnique({
        where: { id },
        include: { teamLead: true, parentCompany: true },
      });

      if (!existingSubsidiary) {
        throw new NotFoundException(`Subsidiary with ID ${id} not found`);
      }

      if (user.companyId !== existingSubsidiary.parentCompanyId) {
        throw new ForbiddenException(
          'You can only update subsidiaries of your own company',
        );
      }

      const {
        industryId,
        parentCompanyId,
        leadId,
        teamLead_email,
        teamLead_name,
        ...rest
      } = updateSubsidiaryDto;

      const data: any = {
        ...rest,
        updated_by: user.id,
      };

      if (industryId) {
        data.industry = {
          connect: { id: industryId },
        };
      }

      if (parentCompanyId) {
        data.parentCompany = {
          connect: { id: parentCompanyId },
        };
      }

      if (leadId || teamLead_email || teamLead_name) {
        let finalLeadId = leadId;
        const leadEmail = teamLead_email?.toLowerCase();

        // If leadId is provided, validate it (handle collisions/invitations)
        if (finalLeadId) {
          const teamLead = await this.prisma.user.findUnique({
            where: { id: finalLeadId },
          });

          if (!teamLead || teamLead.companyId !== user.companyId) {
            const invitation = await this.prisma.invitation.findUnique({
              where: { id: finalLeadId },
            });

            if (invitation && invitation.companyId === user.companyId) {
              // It's an invitation ID, we need to resolve it by email
              const resolvedUser = await this.resolveLeadByEmail(
                user.companyId as number,
                invitation.email,
                teamLead_name,
                user,
                id, // subsidiaryId
              );
              finalLeadId = resolvedUser.id;
            } else if (teamLead) {
              throw new ForbiddenException(
                'You can only assign team leads from your own company',
              );
            } else {
              throw new NotFoundException(
                `User or invitation with id ${finalLeadId} not found`,
              );
            }
          }
        } else if (leadEmail) {
          const resolvedUser = await this.resolveLeadByEmail(
            user.companyId as number,
            leadEmail,
            teamLead_name,
            user,
            id, // subsidiaryId
          );
          finalLeadId = resolvedUser.id;
        }

        if (finalLeadId) {
          data.teamLead = { connect: { id: finalLeadId } };

          // Ensure any pending invitations for the resolved lead are cancelled
          const leadUser = await this.prisma.user.findUnique({
            where: { id: finalLeadId },
            select: { email: true },
          });
          if (leadUser) {
            await this.prisma.invitation.updateMany({
              where: { email: leadUser.email, status: 'pending' },
              data: { status: 'cancelled' },
            });
          }
        }
      }


      await this.activitiesService.logActivity({
        companyId: user?.companyId ?? existingSubsidiary.parentCompany.id,
        createdById: user.id,
        title: `Updated subsidiary - "${existingSubsidiary?.name}"`,
        description: `${user.first_name} updated the subsidiary}`,
        type: 'subsidiary',
      });

      return await this.prisma.subsidiary.update({
        where: { id },
        data,
        include: {
          parentCompany: true,
          industry: { select: { id: true, name: true, code: true, sector: { select: { id: true, name: true } } } },
          teamLead: {
            select: { first_name: true, last_name: true, email: true },
          },
        },
      });
    } catch (error) {
      console.error('Error updating subsidiary:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred while updating the subsidiary',
      );
    }
  }

  async remove(id: number, user_id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
    });

    const subsidiary = await this.prisma.subsidiary.findUnique({
      where: { id },
    });

    if (user?.companyId !== subsidiary?.parentCompanyId) {
      throw new ForbiddenException(
        'You can only update subsidiaries of your own company',
      );
    }

    return this.prisma.subsidiary.delete({
      where: { id },
    });
  }

  private async resolveLeadByEmail(
    companyId: number,
    email: string,
    name?: string,
    creator?: any,
    subsidiaryId?: number,
  ) {
    const emailLower = email.toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (user) {
      if (user.companyId && user.companyId !== companyId) {
        throw new ForbiddenException(
          'User already belongs to a different company',
        );
      }
      // Update companyId if not set
      if (!user.companyId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { companyId },
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
          companyId: companyId,
          subsidiaryId: subsidiaryId,
          password: '',
          roleId: await resolveRoleId(this.prisma, DEFAULT_TEAM_LEAD_ROLE),
          status: 'pending',
        },
      });

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      });

      await this.emailService.sendEmail(
        user.email,
        {
          firstname: firstName || emailLower,
          link: this.configService.get('FRONTEND_URL') + '/register',
          admin_name: creator ? `${creator.first_name} ${creator.last_name || ''}`.trim() : 'Admin',
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
