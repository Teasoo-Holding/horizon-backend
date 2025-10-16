import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { ActivitiesService } from 'src/activities/activities.service';

@Module({
    controllers: [InvitationsController],
    providers: [InvitationsService, PrismaService, EmailService, ActivitiesService],
    exports: [InvitationsService],
})
export class InvitationsModule { }
