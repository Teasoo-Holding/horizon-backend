import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  Scope1ComputationService,
  Scope2Computation,
  Scope3ComputationService,
} from './computation.service';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import {
  MobileSourcesDto,
  StationarySourcesDto,
} from './dto/create-computation.dto';
import { ProcessEmissionDto } from './dto/process-emission.dto';
import { FugitiveEmissionCalculationDto } from './dto/fugutive-emission.dto';
import {
  LocationBasedEmissionDto,
  MarketBasedEmissionDto,
} from './dto/scope2-computation.dto';
import { UpstreamEmissionDto } from './dto/upstream-computation.dto';
import { DownstreamEmisionDto } from './dto/downstream-computation.dto';

@Controller('computation')
export class ComputationController {
  constructor(
    private readonly computationService: Scope1ComputationService,
    private readonly scope2Service: Scope2Computation,
    private readonly scope3Service: Scope3ComputationService,
  ) {}

  // test the api route
  @Get()
  test() {
    return {
      status: true,
      message: 'This route works perfectly',
    };
  }

  // Scope 1 emission
  @Post('stationary-sources')
  @ApiOperation({ summary: 'Compute emissions from stationary sources' })
  @ApiBody({ type: StationarySourcesDto })
  async stationarySources(@Body() dto: StationarySourcesDto) {
    return this.computationService.stationarySources(dto);
  }

  @Post('mobile-sources')
  @ApiOperation({
    summary:
      'Emissions from moving equipment or vehicles, such as trucks, ships, or planes.',
  })
  @ApiBody({ type: MobileSourcesDto })
  async mobileSources(@Body() dto: MobileSourcesDto) {
    return await this.computationService.mobileSources(dto);
  }

  @Post('process-emission')
  @ApiOperation({
    summary:
      'Greenhouse gases released during industrial or chemical processes, not from fuel combustion.',
  })
  @ApiBody({ type: ProcessEmissionDto })
  async processEmission(@Body() dto: ProcessEmissionDto) {
    return await this.computationService.ProcessEmission(dto);
  }

  @Post('fugitive-emission')
  @ApiOperation({
    summary:
      'Unplanned releases of gases from equipment, pipelines, storage tanks, or processes, including methane leaks, gas venting, flaring inefficiencies, and refrigerant losses.',
  })
  @ApiBody({
    type: FugitiveEmissionCalculationDto,
  })
  async fugutuveEmission(@Body() dto: FugitiveEmissionCalculationDto) {
    return await this.computationService.FugitiveEmission(dto);
  }

  // Scope 2 emission
  @Post('location-based')
  @ApiOperation({
    summary: 'Indirect Emissions from Purchased Energy',
  })
  @ApiBody({
    type: LocationBasedEmissionDto,
  })
  async locationBasedEmission(@Body() dto: LocationBasedEmissionDto) {
    return await this.scope2Service.locationBasedEmission(dto);
  }
  @Post('market-based')
  @ApiOperation({
    summary: 'Indirect Emissions from Purchased Energy',
  })
  @ApiBody({
    type: MarketBasedEmissionDto,
  })
  async marketBasedEmission(@Body() dto: MarketBasedEmissionDto) {
    return await this.scope2Service.marketBasedEmission(dto);
  }

  // Scope 3
  @Post('upstream')
  @ApiOperation({
    summary: 'Value Chain Emissions: related to goods and services purchased',
  })
  @ApiBody({
    type: UpstreamEmissionDto,
  })
  async upstream(@Body() dto: UpstreamEmissionDto) {
    return await this.scope3Service.upstreamEmission(dto);
  }
  @Post('downstream')
  @ApiOperation({
    summary: 'Value Chain Emissions: related to sold products',
  })
  @ApiBody({
    type: DownstreamEmisionDto,
  })
  async downstream(@Body() dto: DownstreamEmisionDto) {
    return await this.scope3Service.downstreamEmission(dto);
  }
}
