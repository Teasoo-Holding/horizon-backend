import { Body, Controller, Post } from '@nestjs/common';
import { ComputationService } from './computation.service';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { MobileSourcesDto, StationarySourcesDto } from './dto/create-computation.dto';

@Controller('computation')
export class ComputationController {
  constructor(private readonly computationService: ComputationService) {}

  @Post('stationary-sources')
  @ApiOperation({ summary: 'Compute emissions from stationary sources' })
  @ApiBody({ type: StationarySourcesDto })
  async stationarySources(@Body() dto: StationarySourcesDto) {
    return this.computationService.stationarySources(dto)
  }
  
  @Post('mobile-sources')
  @ApiOperation({summary: "Emissions from moving equipment or vehicles, such as trucks, ships, or planes."})
  @ApiBody({type: MobileSourcesDto})
  async mobileSources(
    @Body() dto: MobileSourcesDto
  ){
    return await this.computationService.mobileSources(dto)
  }
}
