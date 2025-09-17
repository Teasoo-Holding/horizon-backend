import { Module } from '@nestjs/common';

import { ComputationController } from './computation.controller';
import { Scope1ComputationService, Scope2Computation, Scope3ComputationService } from './computation.service';

@Module({
  controllers: [ComputationController],
  providers: [Scope1ComputationService,Scope2Computation, Scope3ComputationService],
})
export class ComputationModule {}
