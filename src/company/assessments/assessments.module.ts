import { Module } from '@nestjs/common';
import { AssessmentController } from './assessments.controller';
import { AssessmentService } from './assessments.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ComputationModule } from 'src/assessment/computation/computation.module';
import { ReportModule } from '../report/report.module';
import { ActivitiesService } from 'src/activities/activities.service';
import { EmailModule } from 'src/email/email.module';
import { TasksModule } from '../tasks/tasks.module';
import { AssessmentCalculatorService } from './assessment-calculator.service';

@Module({
  imports: [PrismaModule, ComputationModule, ReportModule, EmailModule, TasksModule],
  controllers: [AssessmentController],
  providers: [AssessmentService, ActivitiesService, AssessmentCalculatorService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
