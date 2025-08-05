import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { OtpController } from './otp.controller';

@Module({
    providers: [OtpService, PrismaService, EmailService],
    exports: [OtpService],
    controllers: [OtpController],
})
export class OtpModule {}
