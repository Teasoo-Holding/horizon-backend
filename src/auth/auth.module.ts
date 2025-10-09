import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EmailService } from 'src/email/email.service';
import { OtpService } from 'src/otp/otp.service';
import { ActivitiesService } from 'src/activities/activities.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [
    AuthService,
    PrismaService,
    JwtStrategy,
    EmailService,
    OtpService,
    ActivitiesService
  ],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
