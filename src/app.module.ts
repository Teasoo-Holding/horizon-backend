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
import { RateLimitModule } from './infrastructure/rate_limiting/rate_limit.module';
import { CompanyModule } from './company/company.module';
import { DepartmentsModule } from './company/departments/departments.module';
import { AdminAuthService } from './admin/auth/auth.service';
import { AdminAuthController } from './admin/auth/auth.controller';
import { AdminAuthModule } from './admin/auth/auth.module';
import { InvitationsModule } from './company/sub-users/invitations.module';
import { CookiesModule } from './cookies.module';
import { EsgAuthModule } from './auth/esg-auth/esg-auth.module';
import { SubsidiaryService } from './subsidiary/subsidiary.service';
import { SubsidiaryController } from './subsidiary/subsidiary.controller';
import { SubsidiaryModule } from './subsidiary/subsidiary.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    EmailModule,
    OtpModule,
    RateLimitModule,
    EsgAuthModule,
    CompanyModule,
    DepartmentsModule,
    AdminAuthModule,
    InvitationsModule,
    CookiesModule,
    SubsidiaryModule
  ],
  controllers: [AppController, AdminAuthController, AuthController, SubsidiaryController],
  providers: [
    AppService,
    AdminAuthService,
    EmailService,
    OtpService,
    AuthService,
    SubsidiaryService,
  ],
})
export class AppModule {}
