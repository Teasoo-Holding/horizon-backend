

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';



export class FugitiveEmissionCalculationDto {
  @ApiProperty({
    description: 'Volume of gas vented or leaked in cubic metres (m³)',
    example: 100,
  })
  @IsNumber()
  @IsPositive()
  volume: number;

  @ApiPropertyOptional({
    description: 'Methane density in kg/m³ (default: 0.656 kg/m³)',
    example: 0.656,
    default: 0.656,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  methaneDensity?: number;

  @ApiPropertyOptional({
    description: 'Global Warming Potential for methane (default: 28)',
    example: 28,
    default: 28,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  gwp?: number;
}



export class GasEmissionResultDto {
  @ApiProperty({
    description: 'CO2 equivalent emissions in tonnes',
    example: 1.84,
  })
  tCO2e: number;

  @ApiProperty({
    description: 'CO2 equivalent emissions in kilograms',
    example: 1840,
  })
  kgCO2e: number;

  @ApiProperty({
    description: 'Methane mass in kilograms',
    example: 65.6,
  })
  methaneMass: number;
}