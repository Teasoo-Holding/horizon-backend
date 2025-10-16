import { Module } from '@nestjs/common';
import { SubsidiaryService } from './subsidiary.service';
import { SubsidiaryController } from './subsidiary.controller';
import { EmailService } from 'src/email/email.service';
import { ActivitiesService } from 'src/activities/activities.service';

@Module({
  controllers: [SubsidiaryController],
  providers: [SubsidiaryService, EmailService, ActivitiesService],
})
export class SubsidiaryModule {}
