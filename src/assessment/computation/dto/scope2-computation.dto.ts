import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class LocationBasedEmissionDto {
  // 1. Purchased electriciy
  @ApiProperty({
    description: 'Total electricity consumed in kilowatt-hours (kWh)',
    example: 100000,
  })
  @IsNumber()
  electiricity_consumed: number;

  @ApiProperty({
    description: 'Emission factor for electricity in Nigeria grid',
    example: 0.45,
  })
  @IsNumber()
  @IsOptional()
  electiricity_emission_factor?: number;

  // 2. Purchased Cooling
  @ApiProperty({
    description: 'Amount of purchased cooling energy consumed',
  })
  @IsNumber()
  amount_of_cooling_energy_consumed: number;

  @ApiProperty({
    description:
      'Emission factor for Amount of purchased cooling energy consumed',
    example: 0.45,
  })
  @IsNumber()
  @IsOptional()
  amt_of_c_emission_factor?: number;

  // 3/ Purchased Steam
  @ApiProperty({
    description: 'Total steam consumed (tonnes)',
  })
  @IsNumber()
  total_steam_consumed: number;

  @ApiProperty({
    description: 'Emission factor for Total steam consumed (tonnes)',
    example: 0.45,
  })
  @IsNumber()
  @IsOptional()
  total_steam_consumed_factor?: number;

  // 4. Purchased Heating
  @ApiProperty({
    description: 'Total Purchased heating energy consumed (Gigajoules)',
  })
  @IsNumber()
  total_heating_energy_consumed: number;

  @ApiProperty({
    description: 'Emission factor for Total heating energy consumed (tonnes)',
    example: 0.45,
  })
  @IsNumber()
  @IsOptional()
  total_heating_energy_consumed_EF?: number;
}

export class MarketBasedEmissionDto {
  // 1. Purchased Electricity (Independent Power Producers – IPPs)
  @ApiProperty({ description: 'Electricity consumed from IPPs (kWh)' })
  @IsNumber()
  ipp_electricity_consumed: number;

  @ApiProperty({ description: 'Emission factor for IPPs electricity' })
  @IsNumber()
  @IsOptional()
  ipp_emission_factor?: number;

  // 2. Purchased Electricity with EACs/RECs
  @ApiProperty({ description: 'Electricity consumed with EACs/RECs (kWh)' })
  @IsNumber()
  eac_electricity_consumed: number;

  @ApiProperty({ description: 'Emission factor for EACs/RECs electricity' })
  @IsNumber()
  @IsOptional()
  eac_emission_factor?: number;

  // 3. Residual Mix Purchased Electricity
  @ApiProperty({ description: 'Residual mix electricity consumed (kWh)' })
  @IsNumber()
  residual_electricity_consumed: number;

  @ApiProperty({ description: 'Emission factor for residual electricity' })
  @IsNumber()
  @IsOptional()
  residual_emission_factor?: number;

  // 4. Cooling / Steam
  @ApiProperty({ description: 'Cooling/Steam energy consumed (kWh)' })
  @IsNumber()
  coolingsteam_energy_consumed: number;

  @ApiProperty({ description: 'Emission factor for Cooling/Steam' })
  @IsNumber()
  @IsOptional()
  coolingsteam_emission_factor?: number;
}
