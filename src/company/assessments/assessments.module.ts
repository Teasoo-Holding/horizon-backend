import { Module } from '@nestjs/common';
import { AssessmentController } from './assessments.controller';
import { AssessmentService } from './assessments.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AssessmentController],
  providers: [AssessmentService, PrismaService],
})
export class AssessmentModule {}
