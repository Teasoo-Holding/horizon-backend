// company-setup.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BulkCreateDto } from './dtos/bulk-create.dto';

@Injectable()
export class CompanySetupService {
  constructor(private readonly prisma: PrismaService) {}

  async bulkCreate(companyId: number, dto: BulkCreateDto, invitedById: number) {
    return this.prisma.$transaction(async (prisma) => {
      const createdSubsidiaries = [];
      const createdDepartments = [];
      const createdInvitations = [];

      // Step 1: Create all subsidiaries
      for (const subDto of dto.subsidiaries) {
        const newSub = await prisma.subsidiary.create({
          data: {
            ...subDto,
            parentCompanyId: companyId,
            // You may need to map industry name to id here if that's how your DTO works
            industryId: subDto.industryId,
            // map teamLead_email to teamLeadId here
          },
        });
        createdSubsidiaries.push(newSub);
      }

      // Step 2: Create all departments
      for (const deptDto of dto.departments) {
        const subsidiary = createdSubsidiaries.find(
          (s) => s.name === deptDto.subsidiaryName,
        );
        if (!subsidiary) {
          throw new BadRequestException(
            'Subsidiary not found for department creation',
          );
        }

        const newDept = await prisma.department.create({
          data: {
            ...deptDto,
            companyId,
            subsidiaryId: subsidiary.id,
            // map lead name to leadId here
          },
        });
        createdDepartments.push(newDept);
      }

      // Step 3: Create all user invitations
      for (const userDto of dto.users) {
        // You'll need to handle the dependencies here
        const subsidiary = createdSubsidiaries.find(
          (s) => s.name === userDto.subsidiaryName,
        );
        const department = createdDepartments.find(
          (d) => d.name === userDto.departmentName,
        );

        const newInvitation = await prisma.invitation.create({
          data: {
            ...userDto,
            companyId,
            subsidiaryId: subsidiary?.id,
            departmentId: department?.id,
            invitedById,
          },
        });
        createdInvitations.push(newInvitation);
      }

      return {
        subsidiaries: createdSubsidiaries,
        departments: createdDepartments,
        invitations: createdInvitations,
      };
    });
  }
}
