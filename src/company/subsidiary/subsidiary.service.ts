import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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

        if (!teamLead) {
          throw new NotFoundException(
            `User with id ${createSubsidiaryDto.leadId} not found`,
          );
        }

        if (teamLead.companyId !== user.companyId) {
          throw new ForbiddenException(
            'You can only assign team leads from your own company',
          );
        }
      }
      // CASE 2: teamLead_email was provided
      else if (createSubsidiaryDto.teamLead_email) {
        teamLead = await this.prisma.user.findUnique({
          where: { email: createSubsidiaryDto.teamLead_email },
        });

        if (!teamLead) {
          teamLead = await this.prisma.user.create({
            data: {
              email: createSubsidiaryDto.teamLead_email,
              first_name: createSubsidiaryDto?.teamLead_name ?? '',
              companyId: user.companyId,
              password: '',
              roleId: 2,
            },
          });

          await this.emailService.sendEmail(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            teamLead.email,
            {
              first_name: createSubsidiaryDto?.teamLead_name ?? '',
              link: this.configService.get('FRONTEND_URL') + '/register',
              admin_name: user.first_name,
              esg_name: company?.name,
            },
            6,
          );
        }

        if (teamLead.companyId !== user.companyId) {
          throw new ForbiddenException(
            'You can only create subsidiaries with your own team lead',
          );
        }
      }
      // CASE 3: No teamLead provided → use current user as teamLead
      else {
        teamLead = user;
      }

      let industryRecord: {
        id: number;
        industry: string;
        sector?: string;
      } | null = null;

      if (createSubsidiaryDto.industry) {
        industryRecord = await this.prisma.industry.findFirst({
          where: { industry: createSubsidiaryDto.industry },
        });

        if (!industryRecord) {
          industryRecord = await this.prisma.industry.create({
            data: {
              industry: createSubsidiaryDto.industry,
              sector: createSubsidiaryDto.sector ?? '',
            },
          });
        }
      }

      try {
        console.log('ind', createSubsidiaryDto.industryId);
        const subsidiary = await this.prisma.subsidiary.create({
          data: {
            name: createSubsidiaryDto.name,
            industryId:
              industryRecord?.id ?? createSubsidiaryDto.industryId ?? null,
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
            industry: { select: { id: true, industry: true, sector: true } },
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

    if (user?.role.name !== 'super_admin') {
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
        industry: { select: { id: true, industry: true, sector: true } },
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
        industry: { select: { industry: true, sector: true } },
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

      const { industryId, parentCompanyId, leadId, ...rest } =
        updateSubsidiaryDto;

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

      if (leadId) {
        data.teamLead = {
          connect: { id: leadId },
        };
      }

      if (
        updateSubsidiaryDto.teamLead_email ||
        updateSubsidiaryDto.teamLead_name
      ) {
        data.teamLead = {
          update: {
            email:
              updateSubsidiaryDto.teamLead_email ??
              existingSubsidiary.teamLead?.email,
            first_name:
              updateSubsidiaryDto.teamLead_name ??
              existingSubsidiary.teamLead?.first_name,
          },
        };
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
          industry: { select: { id: true, industry: true, sector: true } },
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
}
