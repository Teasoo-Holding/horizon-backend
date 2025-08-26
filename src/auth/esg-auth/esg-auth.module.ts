import { Module } from '@nestjs/common';
import { EsgAuthController } from './esg-auth.controller';
import { EsgAuthService } from './esg-auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailService } from 'src/email/email.service';
import { InvitationsModule } from '../../company/sub-users/invitations.module';
import { PhoneValidationService } from 'src/config/phone-validation.service';

@Module({
  imports: [PrismaModule, InvitationsModule],
  controllers: [EsgAuthController],
  providers: [EsgAuthService, EmailService, PhoneValidationService],
})
export class EsgAuthModule {}
