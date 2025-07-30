import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';

@Module({
    providers: [OtpService, PrismaService, EmailService],
    exports: [OtpService],
})
export class OtpModule {}
