import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarketBasedS2Dto {
  @ApiPropertyOptional()
  id?: number;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  total_electricity_consumed?: number;

  @ApiPropertyOptional()
  supplier_specific_emission_factor?: number;

  @ApiPropertyOptional()
  subsidiaryId?: number;

  @ApiPropertyOptional()
  electricity_supplier_contract_with_ipps_url?: string;

  @ApiPropertyOptional()
  electricity_supplier_contract_with_ipps_url_public_id?: string;

  @ApiPropertyOptional()
  supplier_issued_emmission_factor_documentation_url?: string;

  @ApiPropertyOptional()
  supplier_issued_emmission_factor_documentation_url_public_id?: string;

  @ApiPropertyOptional()
  invoices_and_bills_from_ipp_url?: string;

  @ApiPropertyOptional()
  invoices_or_bills_from_ipp_url_public_id?: string;

  @ApiPropertyOptional()
  total_grid_energy_consumed?: number;

  @ApiPropertyOptional()
  eac_or_rec_certificate_url?: string;

  @ApiPropertyOptional()
  eac_or_rec_certificate_url_public_id?: string;

  @ApiPropertyOptional()
  emission_factor_applied?: number;

  @ApiPropertyOptional()
  energy_attribute_certificate_url?: string;

  @ApiPropertyOptional()
  energy_attribute_certificate_url_public_id?: string;

  @ApiPropertyOptional()
  grid_consumption_invoices_url?: string;

  @ApiPropertyOptional()
  grid_consumption_invoices_url_public_id?: string;

  @ApiPropertyOptional()
  contracts_or_purchased_agreement_url?: string;

  @ApiPropertyOptional()
  contracts_or_purchased_agreement_url_public_id?: string;

  @ApiPropertyOptional()
  purchased_electricity_total_electricity_consumed?: number;

  @ApiPropertyOptional()
  residual_mix_emission_factor_applied?: number;

  @ApiPropertyOptional()
  grid_electricity_invoices_url?: string;

  @ApiPropertyOptional()
  grid_electricity_invoices_url_public_id?: string;

  @ApiPropertyOptional()
  nigerian_grid_emission_factor_documentation_url?: string;

  @ApiPropertyOptional()
  nigerian_grid_emission_factor_documentation_url_public_id?: string;

  @ApiPropertyOptional()
  supplier_contacts_url?: string;

  @ApiPropertyOptional()
  supplier_contacts_url_public_id?: string;

  @ApiPropertyOptional()
  purchased_cooling_quantity_consumed?: number;

  @ApiPropertyOptional()
  purchased_cooling_supplier_specific_emission_factor_applied?: number;

  @ApiPropertyOptional()
  supplier_invoices_for_cooling_or_steam_purchases_url?: string;

  @ApiPropertyOptional()
  supplier_invoices_for_cooling_or_steam_purchases_url_public_id?: string;

  @ApiPropertyOptional()
  supplier_emission_factor_data_sheet_url?: string;

  @ApiPropertyOptional()
  supplier_emission_factor_data_sheet_url_public_id?: string;

  @ApiPropertyOptional()
  performance_or_operational_logs_url?: string;

  @ApiPropertyOptional()
  performance_or_operational_logs_url_public_id?: string;

  @ApiProperty()
  creator_id: number;
}
