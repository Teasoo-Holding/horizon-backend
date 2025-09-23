import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BulkCreateDto } from './dtos/bulk-create.dto';
import { CompanyStatus, UserStatus, Subsidiary, Department, Invitation } from '@prisma/client';
import { EmailService } from 'src/email/email.service';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { formatRoleName } from 'src/utils/format-rolename';

@Injectable()
export class CompanySetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async bulkCreate(companyId: number, dto: BulkCreateDto, invitedById: number) {
    return this.prisma.$transaction(async (prisma) => {
      const createdSubsidiaries: Subsidiary[] = [];
      const createdDepartments: Department[] = [];
      const createdInvitations: Invitation[] = [];

      const invitingUser = await prisma.user.findUnique({
        where: { id: invitedById },
        select: {
          first_name: true,
          last_name: true,
          email: true,
          company: {
            select: { id: true, name: true },
          },
        },
      });

      if (!invitingUser) {
        throw new BadRequestException('Inviting user not found');
      }

      // Step 1: Create all subsidiaries and their team leads
      for (const subDto of dto.subsidiaries) {
        let teamLeadId: number;

        if (subDto.teamLead_email) {
          let teamLead = await prisma.user.findUnique({
            where: { email: subDto.teamLead_email },
          });

          if (!teamLead) {
            teamLead = await prisma.user.create({
              data: {
                email: subDto.teamLead_email,
                first_name: subDto.teamLead_name ?? '',
                companyId,
                password: '',
                roleId: 2,
                status: UserStatus.pending,
              },
            });

            const token = randomUUID();
            const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            await prisma.invitation.create({
              data: {
                email: teamLead.email,
                token,
                expiresAt,
                status: 'pending',
                companyId,
                roleId: 2,
                invitedById,
              },
            });
            await this.emailService.sendEmail(
              teamLead.email,
              {
                first_name: subDto.teamLead_name ?? '',
                link: this.configService.get('FRONTEND_URL') + '/register',
                admin_name: invitingUser.first_name,
                esg_name: invitingUser.company?.name,
              },
              6,
            );
          } else if (teamLead.companyId !== companyId) {
            throw new BadRequestException(
              `Team lead with email ${subDto.teamLead_email} does not belong to this company`,
            );
          }
          teamLeadId = teamLead.id;
        } else {
          teamLeadId = invitedById;
        }

        const newSub = await prisma.subsidiary.create({
          data: {
            name: subDto.name,
            address: subDto.address ?? null,
            industryId: subDto.industryId ?? null,
            status: CompanyStatus.active,
            parentCompanyId: companyId,
            created_by: invitedById,
            updated_by: invitedById,
            teamLeadId: teamLeadId,
            registration_number: subDto.registration_number ?? null,
            sicsCode: subDto.sicsCode ?? null,
            isinCode: subDto.isinCode ?? null,
            isoCountryCode: subDto.isoCountryCode ?? null,
            country: subDto.country ?? null,
            currency: subDto.currency ?? null,
            contact_email: subDto.contact_email ?? null,
            website: subDto.website ?? null,
            contact_phone: subDto.contact_phone ?? null,
            company_logo_url: subDto.company_logo_url ?? null,
          },
        });
        createdSubsidiaries.push(newSub);
      }

      // Step 2: Create all departments
      for (const deptDto of dto.departments) {
        const subsidiary = deptDto.subsidiaryName
          ? createdSubsidiaries.find((s) => s.name === deptDto.subsidiaryName)
          : null;

        const departmentLeadId = deptDto.leadId ?? invitedById;

        const departmentLead = await prisma.user.findUnique({
          where: { id: departmentLeadId },
        });

        if (!departmentLead) {
          throw new BadRequestException(`Department lead with ID ${departmentLeadId} not found`);
        }

        const newDept = await prisma.department.create({
          data: {
            name: deptDto.name,
            description: deptDto.description ?? null,
            contact_email: deptDto.contact_email ?? invitingUser.email,
            companyId,
            leadId: departmentLeadId,
            subsidiaryId: subsidiary?.id ?? null,
          },
        });
        createdDepartments.push(newDept);
      }

      // Step 3: Create all user invitations
      for (const userDto of dto.users) {
        const roleId = userDto.roleId;
        const roleName = userDto.roleName;

        if (!roleId && !roleName) {
          throw new BadRequestException('Either roleId or roleName must be provided for each user.');
        }

        let roleRecord;
        if (roleId) {
          roleRecord = await prisma.role.findUnique({
            where: { id: roleId },
          });
        } else if (roleName) {
          roleRecord = await prisma.role.findUnique({
            where: { name: roleName },
          });
        }

        if (!roleRecord) {
          throw new BadRequestException('Role not found');
        }

        const subsidiary = userDto.subsidiaryName
          ? createdSubsidiaries.find((s) => s.name === userDto.subsidiaryName)
          : null;

        const departmentName = userDto.departmentName;
        const department = departmentName
          ? createdDepartments.find((d) => d.name === departmentName)
          : null;

        const token = randomUUID();
        const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        const newInvitation = await prisma.invitation.create({
          data: {
            email: userDto.email,
            token,
            expiresAt,
            status: 'pending',
            subsidiaryId: subsidiary?.id ?? null,
            departmentId: department?.id ?? null,
            roleId: roleRecord.id,
            invitedById,
            companyId,
          },
        });

        await this.emailService.sendEmail(
          userDto.email,
          {
            firstname: userDto.email,
            admin_name: `${invitingUser.first_name} ${invitingUser.last_name || ''}`.trim(),
            esg_name: invitingUser.company?.name || '',
            formatted_role: formatRoleName(String(roleRecord.name)),
            link: `${this.configService.get('FRONTEND_URL')}/invite-user?token=${token}`,
          },
          6,
        );

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

// // company-setup.service.ts

// import { Injectable, BadRequestException } from '@nestjs/common';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { BulkCreateDto } from './dtos/bulk-create.dto';
// import { CompanyStatus, UserStatus, Subsidiary, Department, Invitation } from '@prisma/client';
// import { EmailService } from 'src/email/email.service';
// import { ConfigService } from '@nestjs/config';
// import { randomUUID } from 'crypto';
// import { formatRoleName } from 'src/utils/format-rolename';

// @Injectable()
// export class CompanySetupService {
//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly emailService: EmailService,
//     private readonly configService: ConfigService,
//   ) {}

//   async bulkCreate(companyId: number, dto: BulkCreateDto, invitedById: number) {
//     return this.prisma.$transaction(async (prisma) => {
//       const createdSubsidiaries: Subsidiary[] = [];
//       const createdDepartments: Department[] = [];
//       const createdInvitations: Invitation[] = [];

//       const invitingUser = await prisma.user.findUnique({
//         where: { id: invitedById },
//         select: {
//           first_name: true,
//           last_name: true,
//           email: true,
//           company: {
//             select: { id: true, name: true },
//           },
//         },
//       });

//       if (!invitingUser) {
//         throw new BadRequestException('Inviting user not found');
//       }

//       // Step 1: Create all subsidiaries and their team leads
//       for (const subDto of dto.subsidiaries) {
//         let teamLeadId: number;

//         if (subDto.teamLead_email) {
//           let teamLead = await prisma.user.findUnique({
//             where: { email: subDto.teamLead_email },
//           });

//           if (!teamLead) {
//             teamLead = await prisma.user.create({
//               data: {
//                 email: subDto.teamLead_email,
//                 first_name: subDto.teamLead_name ?? '',
//                 companyId,
//                 password: '',
//                 roleId: 2,
//                 status: UserStatus.pending,
//               },
//             });

//             const token = randomUUID();
//             const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
//             await prisma.invitation.create({
//               data: {
//                 email: teamLead.email,
//                 token,
//                 expiresAt,
//                 status: 'pending',
//                 companyId,
//                 roleId: 2,
//                 invitedById,
//               },
//             });
//             await this.emailService.sendEmail(
//               teamLead.email,
//               {
//                 first_name: subDto.teamLead_name ?? '',
//                 link: this.configService.get('FRONTEND_URL') + '/register',
//                 admin_name: invitingUser.first_name,
//                 esg_name: invitingUser.company?.name,
//               },
//               6,
//             );
//           } else if (teamLead.companyId !== companyId) {
//             throw new BadRequestException(
//               `Team lead with email ${subDto.teamLead_email} does not belong to this company`,
//             );
//           }
//           teamLeadId = teamLead.id;
//         } else {
//           teamLeadId = invitedById;
//         }

//         const newSub = await prisma.subsidiary.create({
//           data: {
//             name: subDto.name,
//             address: subDto.address ?? null,
//             industryId: subDto.industryId ?? null,
//             status: CompanyStatus.active,
//             parentCompanyId: companyId,
//             created_by: invitedById,
//             updated_by: invitedById,
//             teamLeadId: teamLeadId,
//             registration_number: subDto.registration_number ?? null,
//             sicsCode: subDto.sicsCode ?? null,
//             isinCode: subDto.isinCode ?? null,
//             isoCountryCode: subDto.isoCountryCode ?? null,
//             country: subDto.country ?? null,
//             currency: subDto.currency ?? null,
//             contact_email: subDto.contact_email ?? null,
//             website: subDto.website ?? null,
//             contact_phone: subDto.contact_phone ?? null,
//             company_logo_url: subDto.company_logo_url ?? null,
//           },
//         });
//         createdSubsidiaries.push(newSub);
//       }
      


//       // Step 2: Create all departments
//       for (const deptDto of dto.departments) {
//         const subsidiary = deptDto.subsidiaryName
//           ? createdSubsidiaries.find((s) => s.name === deptDto.subsidiaryName)
//           : null;

//         const departmentLeadId = deptDto.leadId ?? invitedById;

//         const departmentLead = await prisma.user.findUnique({
//           where: { id: departmentLeadId },
//         });

//         if (!departmentLead) {
//           throw new BadRequestException(`Department lead with ID ${departmentLeadId} not found`);
//         }

//         const newDept = await prisma.department.create({
//           data: {
//             name: deptDto.name,
//             description: deptDto.description ?? null,
//             contact_email: deptDto.contact_email ?? invitingUser.email,
//             companyId,
//             leadId: departmentLeadId,
//             subsidiaryId: subsidiary?.id ?? null,
//           },
//         });
//         createdDepartments.push(newDept);
//       }

//       // Step 3: Create all user invitations
//       for (const userDto of dto.users) {
//         if (!userDto.roleId && !userDto.roleName) {
//           throw new BadRequestException('Either roleId or roleName must be provided for each user.');
//         }
        
//         let roleRecord;
//         if (userDto.roleId) {
//           roleRecord = await prisma.role.findUnique({
//             where: { id: userDto.roleId },
//           });
//         } else if (userDto.roleName) {
//           roleRecord = await prisma.role.findUnique({
//             where: { name: userDto.roleName },
//           });
//         }

//         if (!roleRecord) {
//           throw new BadRequestException('Role not found');
//         }

//         const subsidiary = userDto.subsidiaryName
//           ? createdSubsidiaries.find((s) => s.name === userDto.subsidiaryName)
//           : null;

//         const department = userDto.departmentName
//           ? createdDepartments.find((d) => d.name === userDto.departmentName)
//           : null;

//         const token = randomUUID();
//         const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

//         const newInvitation = await prisma.invitation.create({
//           data: {
//             email: userDto.email,
//             token,
//             expiresAt,
//             status: 'pending',
//             subsidiaryId: subsidiary?.id ?? null,
//             departmentId: department?.id ?? null,
//             roleId: roleRecord.id,
//             invitedById,
//             companyId,
//           },
//         });

//         await this.emailService.sendEmail(
//           userDto.email,
//           {
//             firstname: userDto.email,
//             admin_name: `${invitingUser.first_name} ${invitingUser.last_name || ''}`.trim(),
//             esg_name: invitingUser.company?.name || '',
//             formatted_role: formatRoleName(String(roleRecord.name)),
//             link: `${this.configService.get('FRONTEND_URL')}/invite-user?token=${token}`,
//           },
//           6,
//         );

//         createdInvitations.push(newInvitation);
//       }

//       return {
//         subsidiaries: createdSubsidiaries,
//         departments: createdDepartments,
//         invitations: createdInvitations,
//       };
//     });
//   }
// }

