import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, PrismaService, EmailService],
})
export class CompanyModule {}
