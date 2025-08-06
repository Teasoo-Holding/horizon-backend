import { Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { OtpModule } from 'src/otp/otp.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminAuthController } from './auth.controller';
import { AdminAuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [ PrismaModule, EmailModule, OtpModule, JwtModule.register({
        secret: process.env.JWT_SECRET || 'your-default-secret',
        signOptions: { expiresIn: '24h' },
    })],
    controllers: [ AdminAuthController],
    exports: [AdminAuthService],
    providers: [ AdminAuthService],
})
export class AdminAuthModule {}
