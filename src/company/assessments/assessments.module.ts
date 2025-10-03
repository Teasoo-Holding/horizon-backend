import { Module } from '@nestjs/common';
import { AssessmentController } from './assessments.controller';
import { AssessmentService } from './assessments.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ComputationModule } from 'src/assessment/computation/computation.module';

@Module({
  imports: [PrismaModule, ComputationModule],
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
