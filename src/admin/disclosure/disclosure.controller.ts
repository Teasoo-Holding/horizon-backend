import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DisclosureService } from './disclosure.service';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin / Disclosure')
@Controller('admin/disclosure')
@UseGuards(JwtRolesGuard)
export class DisclosureController {
  constructor(private readonly disclosureService: DisclosureService) {}

  @Get('sectors')
  @Roles('super_admin', 'platform_subadmin')
  @ApiOperation({ summary: 'List all sectors' })
  async getSectors() {
    return this.disclosureService.getSectors();
  }

  @Post('sectors')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new sector' })
  async createSector(@Body() data: { name: string; description?: string }) {
    return this.disclosureService.createSector(data);
  }

  @Get('pillars')
  @Roles('super_admin', 'platform_subadmin')
  @ApiOperation({ summary: 'List all ESG pillars' })
  async getPillars() {
    return this.disclosureService.getPillars();
  }

  @Get('topics')
  @Roles('super_admin', 'platform_subadmin')
  @ApiQuery({ name: 'pillarId', required: false, type: Number })
  @ApiOperation({ summary: 'List disclosure topics, optionally filtered by pillar' })
  async getTopics(@Query('pillarId') pillarId?: string) {
    return this.disclosureService.getTopics(pillarId ? +pillarId : undefined);
  }

  @Get('subtopics')
  @Roles('super_admin', 'platform_subadmin')
  @ApiQuery({ name: 'topicId', required: false, type: Number })
  @ApiOperation({ summary: 'List subtopics, optionally filtered by topic' })
  async getSubtopics(@Query('topicId') topicId?: string) {
    return this.disclosureService.getSubtopics(topicId ? +topicId : undefined);
  }

  @Get('metrics')
  @Roles('super_admin', 'platform_subadmin')
  @ApiQuery({ name: 'subtopicId', required: false, type: Number })
  @ApiOperation({ summary: 'List metrics, optionally filtered by subtopic' })
  async getMetrics(@Query('subtopicId') subtopicId?: string) {
    return this.disclosureService.getMetrics(subtopicId ? +subtopicId : undefined);
  }

  @Get('submetrics')
  @Roles('super_admin', 'platform_subadmin')
  @ApiQuery({ name: 'metricId', required: false, type: Number })
  @ApiOperation({ summary: 'List submetrics, optionally filtered by metric' })
  async getSubmetrics(@Query('metricId') metricId?: string) {
    return this.disclosureService.getSubmetrics(metricId ? +metricId : undefined);
  }

  @Get('submetric-details')
  @Roles('super_admin', 'platform_subadmin')
  @ApiQuery({ name: 'submetricId', required: false, type: Number })
  @ApiOperation({ summary: 'List submetric details, optionally filtered by submetric' })
  async getSubmetricDetails(@Query('submetricId') submetricId?: string) {
    return this.disclosureService.getSubmetricDetails(submetricId ? +submetricId : undefined);
  }

  @Get('industry-hierarchy/:id')
  @Roles('super_admin', 'platform_subadmin')
  @ApiOperation({ summary: 'Get the full ESG hierarchy for a specific industry' })
  async getIndustryHierarchy(@Param('id') id: string) {
    return this.disclosureService.getIndustryHierarchy(+id);
  }
}
