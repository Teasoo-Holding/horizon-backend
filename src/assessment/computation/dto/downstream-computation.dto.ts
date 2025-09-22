import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from "class-validator";

export class EndOfLifeTreatmentDto {
  @ApiProperty({
    description: "Type of material (e.g. landfilling, recycling, incineration)",
    example: "landfilling",
  })
  @IsString()
  type_of_material: string;

  @ApiProperty({
    description: "Mass of product sold (in kg or tonnes)",
    example: 1200,
  })
  @IsNumber()
  @IsPositive()
  mass_of_products: number;
  
  @ApiProperty({
    description: "Emission factor of the type of material",
    example: 1200,
  })
  @IsNumber()
  @IsPositive()
  type_of_material_ef: number;
}

export class DownstreamEmisionDto {
  // 1.1 Downstream Transportation & Distribution
  @ApiProperty({
    description:
      "Mass of products sold in kg or tonnes (for transportation & distribution)",
    example: 3000,
  })
  @IsNumber()
  @IsPositive()
  mass_of_products_sold: number;

  @ApiProperty({
    description: "Emission factor for mass of products sold",
    example: 0.45,
  })
  @IsNumber()
  @IsPositive()
  mass_of_products_sold_ef: number;

  // 3.1 Use of Sold Products
  @ApiProperty({
    description: "Number of unit products sold",
    example: 500,
  })
  @IsNumber()
  @IsPositive()
  number_of_unit_products_sold: number;

  @ApiProperty({
    description: "Expected lifetime of the product (in years)",
    example: 5,
  })
  @IsNumber()
  @IsPositive()
  expected_lifetime_of_the_product: number;

  @ApiProperty({
    description: "Average annual fuel/energy consumption of product (if applicable)",
    example: 200,
  })
  @IsNumber()
  @IsPositive()
  average_annual_fuel_or_energy_consumption_of_product: number;

  @ApiProperty({
    description: "Emission factor of the energy source or grid location",
    example: 0.8,
  })
  @IsNumber()
  @IsPositive()
  emission_factor_of_energy: number;
  
  // 4. End-of-Life Treatment of Sold Products
  @ApiProperty({
      description:
      "Array of multiple types of material sold and their corresponding mass",
      type: [EndOfLifeTreatmentDto],
    })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EndOfLifeTreatmentDto)
  end_of_life_treatments: EndOfLifeTreatmentDto[];
  
  
  
  //   Downstream Leased Assets
  
  @ApiProperty({
    description: "Total electricity consumed by tenants(in kWh)",
    example: 1000,
  })
  @IsNumber()
  @IsPositive()
  total_electiricity_consumed_by_tennant: number;
  @ApiProperty({
    description: "Emission factor of the electricity",
    example: 1000,
  })
  @IsNumber()
  @IsPositive()
  total_electiricity_consumed_by_tennant_ef: number;
  
  @ApiProperty({
    description: "Total fuel consumed by tenants(in kWh)",
    example: 1000,
  })
  @IsNumber()
  @IsPositive()
  total_fuel_consumed_by_tennant: number;
  @ApiProperty({
    description: "Emission factor for total fuel consumed by tenants(in kWh)",
    example: 0.25,
  })
  @IsNumber()
  @IsPositive()
  total_fuel_consumed_by_tennant_ef: number;
  
  
  //   6.1 Franchises
  @ApiProperty({
    description: "Total electricity consumed by franchise(in kWh)",
    example: 1000,
  })
  @IsNumber()
  @IsPositive()
  total_electiricity_consumed_by_franchise: number;
  @ApiProperty({
    description: "Emission factor of the electricity",
    example: 1000,
  })
  @IsNumber()
  @IsPositive()
  total_electiricity_consumed_by_franchise_ef: number;
  
  @ApiProperty({
    description: "Total fuel consumed by franchise(in kWh)",
    example: 1000,
  })
  @IsNumber()
  @IsPositive()
  total_fuel_consumed_by_franchise: number;
  @ApiProperty({
    description: "Emission factor for total fuel consumed by franchise(in kWh)",
    example: 0.25,
  })
  @IsNumber()
  @IsPositive()
  total_fuel_consumed_by_franchise_ef: number;
  
  
  
  //   7.1 Investments
  @ApiProperty({
    description: "Loan/equity share in invested companies (in %)",
    example: 5,
  })
  @IsNumber()
  @IsPositive()
  investment_equity_share: number;
  @ApiProperty({
    description: "Reported Scope 1 & 2 emissions of portfolio companies",
    example: 0.25,
  })
  @IsNumber()
  @IsPositive()
  investment_reported_scope_1and2_of_portfolio_company: number;


}
