import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { ActivitiesService } from 'src/activities/activities.service';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService, PrismaService, ActivitiesService],
})
export class DepartmentsModule { }
