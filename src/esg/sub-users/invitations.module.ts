import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';

@Module({
    controllers: [InvitationsController],
    providers: [InvitationsService, PrismaService, EmailService],
    exports: [InvitationsService],
})
export class InvitationsModule { }
