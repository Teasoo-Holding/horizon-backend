

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsString, IsArray, ValidateNested, Min, IsPositive } from 'class-validator';

// ✅ Generic DTO for simple computations (most of your methods)
export class BasicComputationDto {
  @ApiProperty({
    description: 'Fuel, energy, distance, or expenditure value (depending on computation)',
    example: 500,
  })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({
    description: 'Emission factor used for the computation (tCO2e per unit)',
    example: 2.5,
  })
  @IsNumber()
  emission_factor: number;
}

// ✅ DTO for oil & gas venting / leaks
export class OilGasVentingDto {
  @ApiProperty({ description: 'Gas volume released (in m³)', example: 1000 })
  @IsNumber()
  gas_volume_released: number;

  @ApiProperty({ description: 'Methane density in kg/m³', example: 0.656, required: false })
  @IsNumber()
  methane_density?: number;

  @ApiProperty({ description: 'Global warming potential for methane', example: 28, required: false })
  @IsNumber()
  global_warming_potential?: number;
}

// ✅ DTO for employee commuting
export class EmployeeCommutingDto {
  @ApiProperty({ description: 'Number of employees', example: 100 })
  @IsNumber()
  number_of_employee: number;

  @ApiProperty({ description: 'Average daily commuting distance (km)', example: 15 })
  @IsNumber()
  average_daily_commuting_distance: number;

  @ApiProperty({ description: 'Emission factor of commuting mode (tCO2e per km)', example: 0.05 })
  @IsNumber()
  emission_factor_of_commuting_mode: number;
}

// ✅ DTO for franchises (array input)
export class FranchiseEnergyInputDto {
  @ApiProperty({ description: 'Type of energy consumed', example: 'diesel' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Energy consumed (litres, kWh, GJ, etc.)', example: 500 })
  @IsNumber()
  energy_consumed: number;

  @ApiProperty({ description: 'Emission factor for this energy type (tCO2e per unit)', example: 2.5 })
  @IsNumber()
  emission_factor: number;
}

export class FranchisesDto {
  @ApiProperty({ type: [FranchiseEnergyInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FranchiseEnergyInputDto)
  energies: FranchiseEnergyInputDto[];
}


export class RefigirantComputationDto {
  @ApiProperty({ description: 'Total refrigerant leakage (in kg)', example: 200 })
  @IsNumber()
  refrigerant_mass: number;

  
  @ApiProperty({ description: 'Global warming potential of the refrigerant', example: 1430 })
  @IsNumber()
  global_warming_potential: number;
}


export class CementComputationDto {
    @ApiProperty({ description: 'Cement produced (in tonnes)', example: 1000 }) 
    @IsNumber()
    cement_produced: number;
    
    @ApiProperty({ description: 'Emission factor for cement production (tCO2e per tonne)', example: 0.9 })
    @IsNumber()
    emission_factor: number;
}

export class AmmoniaUreaComputationDto {
    @ApiProperty({ description: 'Ammonia produced (in tonnes)', example: 1000 }) 
    @IsNumber()
    ammonia_produced: number;
    
    @ApiProperty({ description: 'Emission factor for ammonia production (tCO2e per tonne)', example: 1.6 })
    @IsNumber()
    emission_factor: number;
}

export class NationalGridComputationDto {
    @ApiProperty({ description: 'Electricity consumed (in kWh)', example: 10000 }) 
    @IsNumber()
    electricity_consumed: number;
    
    @ApiProperty({ description: 'Emission factor for national grid (tCO2e per kWh)', example: 0.0005 })
    @IsNumber()
    emission_factor: number;
}


export class GoodsAndServicesDto {
    @ApiProperty({ description: 'Expenditure on goods and services (in currency)', example: 5000 }) 
    @IsNumber()
    expenditure: number;
    
    @ApiProperty({ description: 'Economic emission factor (tCO2e per currency unit)', example: 0.0002 })
    @IsNumber()
    economic_emission_factor: number;
}


export class FuelComputationsDto {
    @ApiProperty({
        description: "Volume of fuel spent",
        example: 2.8
    })

    @ApiProperty({

    })
    @IsNumber()
    fuel_volume: number
    

    @IsNumber()
    emission_factor: number
}


export class FlaringComputationDto {
    @ApiProperty({
        description: "Volume of gas flared in m3",
    })
    @IsNumber()
    gas_volume_flaring: number;

    @ApiProperty({
        description: "Emission factor for flaring",
        example: 0.05  
    })
    @IsNumber()
    emission_factor: number;
}


export class EndOfLifeTreatmentSoldProductsDto {
  @ApiProperty({
    description: 'Total mass of products sold in kg',
    example: 1500,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  total_mass_of_products_sold: number;

  @ApiProperty({
    description: 'Emission factor for end-of-life treatment method (tCO2e per kg)',
    example: 0.25,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  emission_factor_for_end_of_life_treatment_method: number;
}


// Use of Sold Products DTO
export class UseSoldProductsDto {
  @ApiProperty({
    description: 'Product lifetime energy consumption (kWh or liters)',
    example: 1500,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  product_lifetime_energy_consumption: number;

  @ApiProperty({
    description: 'Number of units sold',
    example: 100,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  number_of_units_sold: number;

  @ApiProperty({
    description: 'Regional grid emission factor (tCO2e per unit)',
    example: 0.5,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  regional_grid_emission_factor: number;

  @ApiProperty({
    description: 'Estimated average product lifetime (years)',
    example: 5,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  estimated_average_product_lifetime: number;
}

// Business Travel DTO
export class BusinessTravelDto {
  @ApiProperty({
    description: 'Distance traveled (km)',
    example: 250,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  distance: number;

  @ApiProperty({
    description: 'Emission factor (tCO2e per km)',
    example: 0.12,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  emission_factor: number;
}

// Waste Generated in Operations DTO
export class WasteGeneratedOperationsDto {
  @ApiProperty({
    description: 'Waste mass (tonnes)',
    example: 10,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  waste_mass: number;

  @ApiProperty({
    description: 'Emission factor (tCO2e per tonne)',
    example: 0.8,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  emission_factor: number;
}

// Fuel- & Energy-Related Activities DTO
export class FuelEnergyRelatedActivitiesDto {
  @ApiProperty({
    description: 'Total energy spent (liters, GJ, kg, or kWh)',
    example: 5000,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  total_energy_spent: number;

  @ApiProperty({
    description: 'Upstream lifecycle emission factor',
    example: 0.25,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  upstream_lifecycle_emission_factor: number;
}

// Upstream Transportation & Distribution DTO
export class UpstreamTransportationDistributionDto {
  @ApiProperty({
    description: 'Distance traveled (km)',
    example: 300,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  distance: number;

  @ApiProperty({
    description: 'Mass of goods (tonnes)',
    example: 15,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  mass_of_goods: number;

  @ApiProperty({
    description: 'Emission factor (tCO2e per tonne-km)',
    example: 0.05,
    minimum: 0
  })
  @IsNumber()
  @IsPositive()
  emission_factor: number;
}