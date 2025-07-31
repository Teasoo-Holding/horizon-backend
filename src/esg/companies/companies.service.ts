// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../../prisma/prisma.service';
// import { CreateCompanyDto } from './dtos/create-company.dto';
// import * as bcrypt from 'bcryptjs';

// @Injectable()
// export class CompaniesService {
//   constructor(private readonly prisma: PrismaService) {}

//   async createCompany(dto: CreateCompanyDto): Promise<{
//     id: number;
//     name: string;
//     status: string;
//     contact_email: string;
//   }> {
//     return this.prisma.$transaction(async (tx): Promise<{
//       id: number;
//       name: string;
//       status: string;
//       contact_email: string;
//     }> => {
//       // Validate email domain uniqueness
//       const domain = dto.email.split('@')[1];
//       const existingCompany = await tx.company.findFirst({
//         where: {
//           OR: [
//             { contact_email: { endsWith: domain } },
//             { registration_number: dto.registration_number }
//           ]
//         }
//       });
//       if (existingCompany) {
//         throw new ConflictException('Company with this domain or registration number already exists');
//       }

//       // Create company
//       const company = await tx.company.create({
//         data: {
//           name: dto.company_name,
//           registration_number: dto.registration_number,
//           contact_email: dto.email,
//           industry_type: dto.industry_type,
//           address: dto.address,
//           contact_phone: dto.contact_phone,
//           status: 'PENDING',
//           created_by: 0, // Temporary
//           updated_by: 0  // Temporary
//         },
//         select: {
//           id: true,
//           name: true,
//           status: true,
//           contact_email: true
//         }
//       });

//       // Create admin user
//       const hashedPassword = await bcrypt.hash(dto.password, 10);
//       await tx.user.create({
//         data: {
//           email: dto.email,
//           password: hashedPassword,
//           first_name: dto.first_name,
//           last_name: dto.last_name,
//           company_id: company.id,
//           role: { connect: { name: 'SUSTAINABILITY_MANAGER' } },
//           status: 'PENDING'
//         }
//       });

//       return company;
//     });
//   }

//   async getCompany(id: number) {
//     return this.prisma.company.findUnique({
//       where: { id },
//       select: {
//         id: true,
//         name: true,
//         contact_email: true,
//         status: true,
//         users: {
//           select: {
//             id: true,
//             email: true,
//             first_name: true,
//             last_name: true
//           }
//         }
//       }
//     });
//   }
// }