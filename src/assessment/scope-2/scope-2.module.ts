import { Module } from '@nestjs/common';
import { Scope2Service } from './scope-2-location-based.service';
import { Scope2Controller } from './scope-2-market-based.controller';

@Module({
  controllers: [Scope2Controller],
  providers: [Scope2Service],
})
export class Scope2Module {}
