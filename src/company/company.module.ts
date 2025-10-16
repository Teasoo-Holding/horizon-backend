import { Module } from '@nestjs/common';
import { CompanyController, TestController } from './company.controller';
import { CompanyService } from './company.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InvitationsModule } from './sub-users/invitations.module';
import { CompanyUsersModule } from './sub-users/company-users.module';
import { SubsidiaryModule } from './subsidiary/subsidiary.module';
import { AssessmentModule } from './assessments/assessments.module';
import { Scope1Module } from './assessments/scope1/scope1.module';
import { CompanySetupController } from './company-setup.controller';
import { CompanySetupService } from './company-setup.service';
import { ReportModule } from './report/report.module';
import { ActivitiesService } from 'src/activities/activities.service';

@Module({
  imports: [
    PrismaModule,
    InvitationsModule,
    CompanyUsersModule,
    SubsidiaryModule,
    AssessmentModule,
    Scope1Module,
    ReportModule,
  ],
  controllers: [CompanyController, TestController, CompanySetupController],
  providers: [CompanyService, PrismaService, EmailService, CompanySetupService, ActivitiesService],
})
export class CompanyModule {}
