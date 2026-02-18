import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
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
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRESIN') || '24h') as any,
        },
      }),
      inject: [ConfigService],
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
export class AuthModule { }
