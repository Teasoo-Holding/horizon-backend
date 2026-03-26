import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { GradingService } from './grading.service';

@Module({
  providers: [ScoringService, GradingService],
  exports: [ScoringService, GradingService],
})
export class ScoringModule {}
