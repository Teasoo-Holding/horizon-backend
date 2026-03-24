import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { EmailService } from './email/email.service';
import { EmailModule } from './email/email.module';
import { OtpService } from './otp/otp.service';
import { OtpModule } from './otp/otp.module';
import { CompanyModule } from './company/company.module';
import { DepartmentsModule } from './company/departments/departments.module';
import { IndustriesModule } from './company/industries/industries.module';
import { AdminAuthService } from './admin/auth/auth.service';
import { AdminAuthController } from './admin/auth/auth.controller';
import { AdminAuthModule } from './admin/auth/auth.module';
import { InvitationsModule } from './company/sub-users/invitations.module';
import { CookiesModule } from './cookies.module';
import { EsgAuthModule } from './auth/esg-auth/esg-auth.module';
import { TestModule } from './config/test/test.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { Scope2Module } from './assessment/scope-2/scope-2.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './config/CustomThrottleGuard';
import { ComputationModule } from './assessment/computation/computation.module';
import { AssessmentModule } from './company/assessments/assessments.module';
import { DisclosureModule } from './admin/disclosure/disclosure.module';
import { ActivitiesModule } from './activities/activities.module';
import { ScoringModule } from './assessment/scoring/scoring.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    EmailModule,
    OtpModule,
    EsgAuthModule,
    ActivitiesModule,
    CompanyModule,
    DepartmentsModule,
    IndustriesModule,
    AdminAuthModule,
    InvitationsModule,
    CookiesModule,
    TestModule,
    CloudinaryModule,
    AssessmentModule,
    Scope2Module,
    ComputationModule,
    DisclosureModule,
    ScoringModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  controllers: [AppController, AdminAuthController, AuthController],
  providers: [
    AppService,
    AdminAuthService,
    EmailService,
    OtpService,
    AuthService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
