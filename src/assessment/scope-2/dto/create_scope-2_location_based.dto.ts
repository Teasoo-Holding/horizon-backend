import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReportingPeriod } from '@prisma/client';
import { 
  IsString, 
  IsNumber, 
  IsBoolean, 
  IsEnum, 
  IsOptional 
} from 'class-validator';


export class LocationBasedS2Dto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  subsriptionId?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  creator_id?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  total_electricity_consumption?: number;

  @ApiPropertyOptional({ enum: ReportingPeriod })
  @IsEnum(ReportingPeriod)
  @IsOptional()
  reporting_period_consumption?: ReportingPeriod;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  electricity_supplier?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  invoice_from_electricity_distribution_companies_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  invoice_from_electricity_distribution_companies_url_public_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  smart_or_sub_meter_reading_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  smart_or_sub_meter_reading_url_public_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  utility_contract_or_purchase_agreement_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  utility_contract_or_purchase_agreement_url_public_id?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  amount_of_cooling_energy_consumed?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  purchased_cooling_type_of_cooling_system_used?: string;

  @ApiPropertyOptional({ enum: ReportingPeriod })
  @IsEnum(ReportingPeriod)
  @IsOptional()
  purchased_cooling_reporting_period?: ReportingPeriod;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cooling_energy_invoices_from_service_providers_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cooling_energy_invoices_from_service_providers_url_public_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  equipment_performance_log_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  equipment_performance_log_url_public_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sub_metering_records_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sub_metering_records_url_public_id?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  total_steam_consumed?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  source_of_steam_consumed?: string;

  @ApiPropertyOptional({ enum: ReportingPeriod })
  @IsEnum(ReportingPeriod)
  @IsOptional()
  purchased_steam_reporting_period?: ReportingPeriod;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplier_invoice_for_steam_purchased_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplier_invoice_for_steam_purchased_url_public_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metered_record_for_steam_consumed_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metered_record_for_steam_consumed_url_public_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contracts_with_third_party_providers_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contracts_with_third_party_providers_url_public_id?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  was_heating_energy_purchased?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  total_energyGJ?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplier?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  invoices_for_heating_services_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  invoices_for_heating_services_url_public_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metered_heating_records_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metered_heating_records_url_public_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplier_contracts_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplier_contracts_url_public_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  certification_of_refigirant_type_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  certification_of_refigirant_type_url_public_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  createdAt?: string; // ISO date string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  updatedAt?: string; // ISO date string
}

