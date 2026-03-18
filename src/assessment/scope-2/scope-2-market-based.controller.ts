import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Req,
  ParseIntPipe,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MarketBasedS2Service } from './scope-2-market-based.service';
import { MarketBasedS2Dto } from './dto/create-scope-2.market_baseddto';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { DATA_WRITE_ROLES } from 'src/auth/roles/role.constants';
import { Express } from 'express';

@ApiTags('Market-Based S2')
@ApiBearerAuth()
@Controller('market-based-s2')
export class MarketBasedS2Controller {
  constructor(private readonly service: MarketBasedS2Service) {}

  @Post()
  @ApiOperation({ summary: 'Create MarketBasedS2 record' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: MarketBasedS2Dto })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'electricity_supplier_contract_with_ipps_url', maxCount: 1 },
      { name: 'supplier_issued_emmission_factor_documentation_url', maxCount: 1 },
      { name: 'invoices_and_bills_from_ipp_url', maxCount: 1 },
      { name: 'eac_or_rec_certificate_url', maxCount: 1 },
      { name: 'energy_attribute_certificate_url', maxCount: 1 },
      { name: 'grid_consumption_invoices_url', maxCount: 1 },
      { name: 'contracts_or_purchased_agreement_url', maxCount: 1 },
      { name: 'grid_electricity_invoices_url', maxCount: 1 },
      { name: 'nigerian_grid_emmission_factor_documentation_url', maxCount: 1 },
      { name: 'supplier_contacts_url', maxCount: 1 },
      { name: 'supplier_invoices_for_cooling_or_steam_purchases_url', maxCount: 1 },
      { name: 'supplier_emmission_factor_data_sheet_url', maxCount: 1 },
      { name: 'performance_or_operational_logs_url', maxCount: 1 },
    ]),
  )
  @UseGuards(JwtRolesGuard)
  @Roles(...DATA_WRITE_ROLES)
  async create(
    @Body() dto: MarketBasedS2Dto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
    @Req() req: { user: { id: number } },
  ) {
    return this.service.create(dto, files, req.user.id);
  }


  // Update existing record

    @Patch(':id')
  @ApiOperation({ summary: 'Update MarketBasedS2 record' })
  @ApiParam({ name: 'id', type: Number, description: 'MarketBasedS2 record ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: MarketBasedS2Dto })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'electricity_supplier_contract_with_ipps_url', maxCount: 1 },
      { name: 'supplier_issued_emmission_factor_documentation_url', maxCount: 1 },
      { name: 'invoices_and_bills_from_ipp_url', maxCount: 1 },
      { name: 'eac_or_rec_certificate_url', maxCount: 1 },
      { name: 'energy_attribute_certificate_url', maxCount: 1 },
      { name: 'grid_consumption_invoices_url', maxCount: 1 },
      { name: 'contracts_or_purchased_agreement_url', maxCount: 1 },
      { name: 'grid_electricity_invoices_url', maxCount: 1 },
      { name: 'nigerian_grid_emmission_factor_documentation_url', maxCount: 1 },
      { name: 'supplier_contacts_url', maxCount: 1 },
      { name: 'supplier_invoices_for_cooling_or_steam_purchases_url', maxCount: 1 },
      { name: 'supplier_emmission_factor_data_sheet_url', maxCount: 1 },
      { name: 'performance_or_operational_logs_url', maxCount: 1 },
    ]),
  )
  @UseGuards(JwtRolesGuard)
  @Roles(...DATA_WRITE_ROLES)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarketBasedS2Dto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
    @Req() req: { user: { id: number } },
  ) {
    return this.service.update(id, dto, files, req.user.id);
  }
}