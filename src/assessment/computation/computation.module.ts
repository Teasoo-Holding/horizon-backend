import { Module } from '@nestjs/common';
import { ComputationService } from './computation.service';
import { ComputationController } from './computation.controller';

@Module({
  controllers: [ComputationController],
  providers: [ComputationService],
})
export class ComputationModule {}
