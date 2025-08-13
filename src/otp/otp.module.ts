import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { OtpController } from './otp.controller';
import {  JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    providers: [OtpService, PrismaService, EmailService, JwtService],
    exports: [OtpService],
    controllers: [OtpController],
    imports: [AuthModule]
})
export class OtpModule {}
