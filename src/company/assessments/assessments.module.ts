import { Module } from '@nestjs/common';
import { AssessmentController } from './assessments.controller';
import { AssessmentService } from './assessments.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule], // The AssessmentModule depends on PrismaService
  controllers: [AssessmentController],
  providers: [AssessmentService],
  exports: [AssessmentService] // If other modules need to use AssessmentService
})
export class AssessmentModule {}
