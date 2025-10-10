import { Module } from '@nestjs/common';
import { AssessmentController } from './assessments.controller';
import { AssessmentService } from './assessments.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ComputationModule } from 'src/assessment/computation/computation.module';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [PrismaModule, ComputationModule, ReportModule],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
