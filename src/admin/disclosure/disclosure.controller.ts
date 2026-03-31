import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DisclosureService } from './disclosure.service';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { GetUserDecorator } from 'src/auth/decorators/getuser.decorator';
import {
  CreateSectorDto,
  CreateIndustryDto,
  CreatePillarDto,
  CreateTopicDto,
  CreateSubtopicDto,
  CreateMetricDto,
  CreateSubmetricDto,
  CreateSubmetricDetailDto,
  UpdateHierarchyDto,
} from './dtos/hierarchy.dto';

@ApiTags('Admin / Disclosure')
@Controller('admin/disclosure')
@UseGuards(JwtRolesGuard)
export class DisclosureController {
  constructor(private readonly disclosureService: DisclosureService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTORS
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('sectors')
  @Roles('super_admin', 'platform_subadmin')
  @ApiOperation({ summary: 'List all sectors' })
  async getSectors() {
    return this.disclosureService.getSectors();
  }

  @Get('sectors/:id')
  @Roles('super_admin', 'platform_subadmin')
  @ApiOperation({ summary: 'Get sector details' })
  async getSector(@Param('id') id: string) {
    return this.disclosureService.getSector(+id);
  }

  @Get('sectors/:id/industries')
  @Roles('super_admin', 'platform_subadmin')
  @ApiOperation({ summary: 'List industries for a sector' })
  async getIndustriesBySector(@Param('id') id: string) {
    return this.disclosureService.getIndustriesBySector(+id);
  }

  @Post('sectors')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new sector' })
  async createSector(@GetUserDecorator('id') userId: number, @Body() dto: CreateSectorDto) {
    return this.disclosureService.createSector(userId, dto);
  }

  @Patch('sectors/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update a sector' })
  async updateSector(
    @GetUserDecorator('id') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateHierarchyDto & Partial<CreateSectorDto>,
  ) {
    return this.disclosureService.updateSector(userId, +id, dto);
  }

  @Delete('sectors/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete a sector' })
  async deleteSector(@GetUserDecorator('id') userId: number, @Param('id') id: string) {
    return this.disclosureService.deleteSector(userId, +id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INDUSTRIES
  // ─────────────────────────────────────────────────────────────────────────────
  @Post('industries')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new industry' })
  async createIndustry(@GetUserDecorator('id') userId: number, @Body() dto: CreateIndustryDto) {
    return this.disclosureService.createIndustry(userId, dto);
  }

  @Patch('industries/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update an industry' })
  async updateIndustry(
    @GetUserDecorator('id') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateHierarchyDto & Partial<CreateIndustryDto>,
  ) {
    return this.disclosureService.updateIndustry(userId, +id, dto);
  }

  @Delete('industries/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete an industry' })
  async deleteIndustry(@GetUserDecorator('id') userId: number, @Param('id') id: string) {
    return this.disclosureService.deleteIndustry(userId, +id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PILLARS
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('pillars')
  @Roles('super_admin', 'platform_subadmin')
  @ApiOperation({ summary: 'List all ESG pillars' })
  async getPillars() {
    return this.disclosureService.getPillars();
  }

  @Post('pillars')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new pillar' })
  async createPillar(@GetUserDecorator('id') userId: number, @Body() dto: CreatePillarDto) {
    return this.disclosureService.createPillar(userId, dto);
  }

  @Patch('pillars/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update a pillar' })
  async updatePillar(
    @GetUserDecorator('id') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateHierarchyDto & Partial<CreatePillarDto>,
  ) {
    return this.disclosureService.updatePillar(userId, +id, dto);
  }

  @Delete('pillars/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete a pillar' })
  async deletePillar(@GetUserDecorator('id') userId: number, @Param('id') id: string) {
    return this.disclosureService.deletePillar(userId, +id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOPICS
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('topics')
  @Roles('super_admin', 'platform_subadmin')
  @ApiQuery({ name: 'industryId', required: true, type: Number })
  @ApiQuery({ name: 'pillarId', required: false, type: Number })
  @ApiOperation({ summary: 'List disclosure topics for an industry' })
  async getTopics(@Query('industryId') industryId: string, @Query('pillarId') pillarId?: string) {
    return this.disclosureService.getTopics(+industryId, pillarId ? +pillarId : undefined);
  }

  @Post('topics')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new disclosure topic' })
  async createTopic(@GetUserDecorator('id') userId: number, @Body() dto: CreateTopicDto) {
    return this.disclosureService.createTopic(userId, dto);
  }

  @Patch('topics/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update a topic' })
  async updateTopic(
    @GetUserDecorator('id') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateHierarchyDto & Partial<CreateTopicDto>,
  ) {
    return this.disclosureService.updateTopic(userId, +id, dto);
  }

  @Delete('topics/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete a topic' })
  async deleteTopic(@GetUserDecorator('id') userId: number, @Param('id') id: string) {
    return this.disclosureService.deleteTopic(userId, +id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBTOPICS
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('subtopics')
  @Roles('super_admin', 'platform_subadmin')
  @ApiQuery({ name: 'topicId', required: true, type: Number })
  @ApiOperation({ summary: 'List subtopics for a topic' })
  async getSubtopics(@Query('topicId') topicId: string) {
    return this.disclosureService.getSubtopics(+topicId);
  }

  @Post('subtopics')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new subtopic' })
  async createSubtopic(@GetUserDecorator('id') userId: number, @Body() dto: CreateSubtopicDto) {
    return this.disclosureService.createSubtopic(userId, dto);
  }

  @Patch('subtopics/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update a subtopic' })
  async updateSubtopic(
    @GetUserDecorator('id') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateHierarchyDto & Partial<CreateSubtopicDto>,
  ) {
    return this.disclosureService.updateSubtopic(userId, +id, dto);
  }

  @Delete('subtopics/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete a subtopic' })
  async deleteSubtopic(@GetUserDecorator('id') userId: number, @Param('id') id: string) {
    return this.disclosureService.deleteSubtopic(userId, +id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('metrics')
  @Roles('super_admin', 'platform_subadmin')
  @ApiQuery({ name: 'subtopicId', required: true, type: Number })
  @ApiOperation({ summary: 'List metrics for a subtopic' })
  async getMetrics(@Query('subtopicId') subtopicId: string) {
    return this.disclosureService.getMetrics(+subtopicId);
  }

  @Post('metrics')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new metric' })
  async createMetric(@GetUserDecorator('id') userId: number, @Body() dto: CreateMetricDto) {
    return this.disclosureService.createMetric(userId, dto);
  }

  @Patch('metrics/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update a metric' })
  async updateMetric(
    @GetUserDecorator('id') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateHierarchyDto & Partial<CreateMetricDto>,
  ) {
    return this.disclosureService.updateMetric(userId, +id, dto);
  }

  @Delete('metrics/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete a metric' })
  async deleteMetric(@GetUserDecorator('id') userId: number, @Param('id') id: string) {
    return this.disclosureService.deleteMetric(userId, +id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBMETRICS
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('submetrics')
  @Roles('super_admin', 'platform_subadmin')
  @ApiQuery({ name: 'metricId', required: true, type: Number })
  @ApiOperation({ summary: 'List submetrics for a metric' })
  async getSubmetrics(@Query('metricId') metricId: string) {
    return this.disclosureService.getSubmetrics(+metricId);
  }

  @Post('submetrics')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new submetric' })
  async createSubmetric(@GetUserDecorator('id') userId: number, @Body() dto: CreateSubmetricDto) {
    return this.disclosureService.createSubmetric(userId, dto);
  }

  @Patch('submetrics/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update a submetric' })
  async updateSubmetric(
    @GetUserDecorator('id') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateHierarchyDto & Partial<CreateSubmetricDto>,
  ) {
    return this.disclosureService.updateSubmetric(userId, +id, dto);
  }

  @Delete('submetrics/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete a submetric' })
  async deleteSubmetric(@GetUserDecorator('id') userId: number, @Param('id') id: string) {
    return this.disclosureService.deleteSubmetric(userId, +id);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBMETRIC DETAILS
  // ─────────────────────────────────────────────────────────────────────────────
  @Get('submetric-details')
  @Roles('super_admin', 'platform_subadmin')
  @ApiQuery({ name: 'submetricId', required: true, type: Number })
  @ApiOperation({ summary: 'List submetric details' })
  async getSubmetricDetails(@Query('submetricId') submetricId: string) {
    return this.disclosureService.getSubmetricDetails(+submetricId);
  }

  @Post('submetric-details')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new submetric detail field' })
  async createSubmetricDetail(@GetUserDecorator('id') userId: number, @Body() dto: CreateSubmetricDetailDto) {
    return this.disclosureService.createSubmetricDetail(userId, dto);
  }

  @Patch('submetric-details/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update a submetric detail field' })
  async updateSubmetricDetail(
    @GetUserDecorator('id') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateHierarchyDto & Partial<CreateSubmetricDetailDto>,
  ) {
    return this.disclosureService.updateSubmetricDetail(userId, +id, dto);
  }

  @Delete('submetric-details/:id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Delete a submetric detail field' })
  async deleteSubmetricDetail(@GetUserDecorator('id') userId: number, @Param('id') id: string) {
    return this.disclosureService.deleteSubmetricDetail(userId, +id);
  }

  @Get('industry-hierarchy/:id')
  @Roles('super_admin', 'platform_subadmin')
  @ApiOperation({ summary: 'Get the full ESG hierarchy for a specific industry' })
  async getIndustryHierarchy(@Param('id') id: string) {
    return this.disclosureService.getIndustryHierarchy(+id);
  }

  @Get('audit-logs')
  @Roles('super_admin')
  @ApiOperation({ summary: 'List administrative audit logs' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false, type: Number })
  async getAuditLogs(@Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    return this.disclosureService.getAuditLogs(entityType, entityId ? +entityId : undefined);
  }
}
