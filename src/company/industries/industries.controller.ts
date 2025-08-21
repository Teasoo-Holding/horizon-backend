import { Controller, Get, Param } from '@nestjs/common';
import { IndustriesService } from './industries.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Sectors & Industries')
@Controller('industries')
export class IndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  @Get('sectors')
  @ApiOperation({ summary: 'Get all unique sectors' })
  async getSectors() {
    return this.industriesService.getSectors();
  }

  @Get()
  @ApiOperation({ summary: 'Get all industries' })
  async getIndustries() {
    return this.industriesService.getIndustries();
  }

  @Get('sector/:sector')
  @ApiOperation({ summary: 'Get industries belonging to a sector' })
  async getIndustriesBySector(@Param('sector') sector: string) {
    return this.industriesService.getIndustriesBySector(sector);
  }
}
