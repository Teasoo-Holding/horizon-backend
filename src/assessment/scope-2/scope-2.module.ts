import { Module } from '@nestjs/common';
import { LocationBasedS2Service } from './scope-2-location-based.service';
import { LocationBasedS2Controller } from './scope-2-location-based.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { MarketBasedS2Service } from './scope-2-market-based.service';
import { MarketBasedS2Controller } from './scope-2-market-based.controller';

@Module({
  controllers: [LocationBasedS2Controller, MarketBasedS2Controller],
  providers: [LocationBasedS2Service, MarketBasedS2Service],
  imports: [ CloudinaryModule ]
})
export class Scope2Module {}
