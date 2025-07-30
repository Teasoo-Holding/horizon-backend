import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { EsgSignupDto } from './dtos/esg_signup.dto';

@Injectable()
export class EsgAuthService {
  constructor(private prisma: PrismaService) {}

  async registerCompany(dto: EsgSignupDto) {
    // 1. Validate corporate email domain
    const domain = dto.email.split('@')[1];
    const existing = await this.prisma.company.findFirst({
      where: {
        OR: [
          { contact_email: { endsWith: domain } },
          { registration_number: dto.registration_number },
          
        ],
      },
    });
    if (existing) throw new ConflictException('Company already exists');

    // 2. Create company + user
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.company_name,
          registration_number: dto.registration_number,
          contact_email: dto.email,
          industry_type: dto.industry_type,
          address: dto.address,
          contact_phone: dto.contact_phone,
          status: 'PENDING',
        },
      });

      await tx.user.create({
        data: {
          email: dto.email,
          password: await bcrypt.hash(dto.password, 10),
          first_name: dto.first_name,
          last_name: dto.last_name,
          company_id: company.id,
          role: { connect: { name: 'SUSTAINABILITY_MANAGER' } },
          status: 'PENDING',
        },
      });

      console.log(`ESG signup: ${dto.company_name} (${dto.email})`);
      return { message: 'Registration pending approval' };
    });
  }
}
