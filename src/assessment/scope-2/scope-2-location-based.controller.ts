import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { LocationBasedS2Service } from './scope-2-location-based.service';
import { LocationBasedS2Dto } from './dto/create_scope-2_location_based.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('LocationBasedS2')
@Controller('location-based-s2')
export class LocationBasedS2Controller {
  constructor(private readonly service: LocationBasedS2Service) {}

@Post()
@ApiOperation({ summary: 'Create LocationBasedS2 record' })
@ApiConsumes('multipart/form-data')
@ApiBody({ type: LocationBasedS2Dto })
@UseInterceptors(FileFieldsInterceptor([
  { name: 'invoice_from_electricity_distribution_companies_url', maxCount: 1 },
  { name: 'smart_or_sub_meter_reading_url', maxCount: 1 },
  { name: 'utility_contract_or_purchase_agreement_url', maxCount: 1 },
  { name: 'cooling_energy_invoices_from_service_providers_url', maxCount: 1 },
  { name: 'equipment_performance_log_url', maxCount: 1 },
  { name: 'sub_metering_records_url', maxCount: 1 },
  { name: 'supplier_invoice_for_steam_purchased_url', maxCount: 1 },
  { name: 'metered_record_for_steam_consumed_url', maxCount: 1 },
  { name: 'contracts_with_third_party_providers_url', maxCount: 1 },
  { name: 'invoices_for_heating_services_url', maxCount: 1 },
  { name: 'metered_heating_records_url', maxCount: 1 },
  { name: 'supplier_contracts_url', maxCount: 1 },
  { name: 'certification_of_refigirant_type_url', maxCount: 1 },
]))
@UseGuards(JwtAuthGuard)
async create(
  @Body() dto: LocationBasedS2Dto,
  @UploadedFiles() files: Record<string, Express.Multer.File[]>,
  @Req() req: { user: { id: number } },
) {
  return this.service.create(dto, files, req.user.id);
}


  @Get()
  @ApiOperation({ summary: 'Get all LocationBasedS2 records' })
  async findAll() {
    return this.service.findAll();
  }


  @Get(':id')
  @ApiOperation({ summary: 'Get single LocationBasedS2 record' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /**
   * Update record
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update LocationBasedS2 record' })
  @ApiParam({ name: 'id', type: Number, description: 'LocationBasedS2 record ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: LocationBasedS2Dto })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'invoice_from_electricity_distribution_companies_url', maxCount: 1 },
      { name: 'smart_or_sub_meter_reading_url', maxCount: 1 },
      { name: 'utility_contract_or_purchase_agreement_url', maxCount: 1 },
      { name: 'cooling_energy_invoices_from_service_providers_url', maxCount: 1 },
      { name: 'equipment_performance_log_url', maxCount: 1 },
      { name: 'sub_metering_records_url', maxCount: 1 },
      { name: 'supplier_invoice_for_steam_purchased_url', maxCount: 1 },
      { name: 'metered_record_for_steam_consumed_url', maxCount: 1 },
      { name: 'contracts_with_third_party_providers_url', maxCount: 1 },
      { name: 'invoices_for_heating_services_url', maxCount: 1 },
      { name: 'metered_heating_records_url', maxCount: 1 },
      { name: 'supplier_contracts_url', maxCount: 1 },
      { name: 'certification_of_refigirant_type_url', maxCount: 1 },
    ]),
  )
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LocationBasedS2Dto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
    @Req() req: { user: { id: number } },
  ) {
    return this.service.update(id, dto, files, req.user.id);
  }


  @Delete(':id')
  @ApiOperation({ summary: 'Delete LocationBasedS2 record' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
