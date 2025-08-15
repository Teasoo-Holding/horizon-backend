import { Module } from '@nestjs/common';
import { EsgAuthController } from './auth/esg-auth.controller';
import { EsgAuthService } from './auth/esg-auth.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailService } from 'src/email/email.service';
import { InvitationsModule } from './sub-users/invitations.module';

@Module({
  imports: [PrismaModule],
  controllers: [EsgAuthController],
  providers: [EsgAuthService, EmailService, InvitationsModule],
})
export class EsgModule {}