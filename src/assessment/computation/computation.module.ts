import { Module } from '@nestjs/common';

import { ComputationController } from './computation.controller';
import {
  Scope1ComputationService,
  Scope2Computation,
  Scope3ComputationService,
} from './computation.service';

import { AirQualityComputationService } from './air-quality.service';
import { WaterComputationService } from './water.service';
import { BiodiversityComputationService } from './biodiversity.service';

@Module({
  controllers: [ComputationController],
  providers: [
    Scope1ComputationService,
    Scope2Computation,
    Scope3ComputationService,
    AirQualityComputationService,
    WaterComputationService,
    BiodiversityComputationService,
  ],
  exports: [
    Scope1ComputationService,
    Scope2Computation,
    Scope3ComputationService,
    AirQualityComputationService,
    WaterComputationService,
    BiodiversityComputationService,
  ],
})
export class ComputationModule { }
