import { ApiProperty } from '@nestjs/swagger';
import { IsNumber,  IsOptional } from 'class-validator';

// export class FuelConsumptionItemDto {
//   @ApiProperty({
//     description: "Volume of fuel consumed (diesel, petrol, etc.)",
//     example: 500,
//   })
//   @IsNumber()
//   volume_of_fuel_consumed: number;

//   @ApiProperty({
//     description: "Emission factor for the above fuel volume",
//     example: 0.28,
//   })
//   @IsNumber()
//   volume_of_fuel_consumed_ef: number;
// }

export class UpstreamEmissionDto {
  @ApiProperty({ description: "Total amount spent on purchased goods/services" })
  @IsNumber()
  total_amount_spent_on_goods_and_services: number;

  @ApiProperty({
    description: "Emission factor for total amount spent on purchased goods/services",
  })
  @IsNumber()
  total_amount_spent_on_goods_and_services_ef: number;

  @ApiProperty({ description: "2.1 Capital Goods: Total cost of capital goods purchased" })
  @IsNumber()
  total_cost_of_capital_goods_purchased: number;

  @ApiProperty({
    description: "Emission factor for Capital Goods: Total cost of capital goods purchased",
  })
  @IsNumber()
  total_cost_of_capital_goods_purchased_ef: number;

  @ApiProperty({
    description: "3.1 Fuel & Energy-Related Activities: Volume of fuel consumed (diesel, petrol, etc.)",
    required: false,
  })
  @IsNumber()
  volume_of_fuel_consumed: number;

  @ApiProperty({
    description: "Emission factor for Fuel & Energy-Related Activities",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  volume_of_fuel_consumed_ef?: number;
 
 
 
  @ApiProperty({
    description: "4.1 Upstream Transportation & Distribution: Mass of goods transported in tonnes)",
    required: false,
  })
  @IsNumber()
  mass_of_goods_transported: number;

  @ApiProperty({
    description: "Emission factor for Fuel & Energy-Related Activities",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  mass_of_goods_transported_ef?: number;

  @ApiProperty({
    description: "Distance travelled in km",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  distance_travelled: number;



  @ApiProperty({
    description: "5.1 Waste Generated in Operations in tonnes)",
    example: 3000
  })
  @IsNumber()
  total_weight_of_waste_generated: number;

  @ApiProperty({
    description: "Emission factor for Total weight of waste generated",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  total_weight_of_waste_generated_ef?: number;
 
 
  @ApiProperty({
    description: "6.1 Business Travel: total travelled distance in km)",
    example: 3000
  })
  @IsNumber()
  total_distance_travelled: number;

  @ApiProperty({
    description: "Emission factor of the means of travel for total travelled distance",
  })
  @IsNumber()
  total_distance_travelled_ef?: number;
  
  
  
  @ApiProperty({
    description: "Total air distance travelled in km",
    example: 3000
  })
  @IsNumber()
  total_air_distance_travelled: number;

  @ApiProperty({
    description: "Emission factor for air travel distance",
  })
  @IsNumber()
  total_air_distance_travelled_ef?: number;
  
  @ApiProperty({
    description: "Total number of flights taken",
  })
  @IsNumber()
  total_number_of_flights_taken: number;
  @ApiProperty({
    description: "Total Number of Employee for all Trips",
  })
  @IsNumber()
  total_number_of_employee_for_all_trips: number;

  
  
//   7.1 Employee Commuting
  @ApiProperty({
    description: "7.1 Employee Commuting: Number of employees commuting",
    example: 3000
  })
  @IsNumber()
  number_of_employees_commuting: number;
  
  @ApiProperty({
    description: "Average one-way commuting distance in km",
    example: 3000
  })
  @IsNumber()
  average_distance_commuting: number;

  @ApiProperty({
    description: "Emission factor of the means of travel for total travelled distance",
  })
  @IsNumber()
  number_of_employees_commuting_ef?: number;
  
  @ApiProperty({
    description: "Average number of workdays per year",
    default: 250
  })
  @IsNumber()
  average_number_of_workdays_per_year: number;
  
  
  @ApiProperty({
    description: "Total electricity consumed by leased assets",
  })
  @IsNumber()
  total_electricity_consumedby_leased_assets: number;
  
  @ApiProperty({
    description: "Emission factor for total_electricity_consumedby_leased_assets",
  })
  @IsNumber()
  total_electricity_consumedby_leased_assets_ef: number;
  @ApiProperty({
    description: "Total fuel consumed by leased assets",
  })
  @IsNumber()
  total_fuel_consumedby_leased_assets: number;
  
  @ApiProperty({
    description: "Emission factor for total_electricity_consumedby_leased_assets",
  })
  @IsNumber()
  total_fuel_consumedby_leased_assets_ef: number;



//   8.1 Upstream Leased Assets




//   @ApiProperty({
//     description: "Array of multiple fuel consumption + emission factor pairs",
//     type: [FuelConsumptionItemDto],
//     required: false,
//   })
//   @IsOptional()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => FuelConsumptionItemDto)
//   multiple_fuel_consumptions?: FuelConsumptionItemDto[];

}
