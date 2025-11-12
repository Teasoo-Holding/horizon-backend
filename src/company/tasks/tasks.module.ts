import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TaskController } from './tasks.controller';
import { TaskService } from './tasks.service';
import { EmailService } from 'src/email/email.service';
import { ActivitiesService } from 'src/activities/activities.service';

@Module({
  controllers: [TaskController],
  providers: [TaskService, PrismaService, EmailService, ActivitiesService],
})
export class TasksModule {}
