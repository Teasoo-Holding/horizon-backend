import { Module } from '@nestjs/common';

import { ComputationController } from './computation.controller';
import { Scope1ComputationService, Scope2Computation, Scope3ComputationService } from './computation.service';
import { ComputationFacade } from './computation.facade';

@Module({
  controllers: [ComputationController],
  providers: [Scope1ComputationService,Scope2Computation, Scope3ComputationService, ComputationFacade],
  exports: [ComputationFacade],
})
export class ComputationModule {}
