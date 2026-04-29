import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSectorDto {
  @ApiProperty({ example: 'Technology & Communications' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Covers software and services' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'SASB-TC' })
  @IsOptional()
  @IsString()
  sasbCode?: string;
}

export class UpdateSectorDto {
  @ApiPropertyOptional({ example: 'Technology & Communications' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Covers software and services' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'SASB-TC' })
  @IsOptional()
  @IsString()
  sasbCode?: string;
}

export class CreateIndustryDto {
  @ApiProperty({ example: 'Software & IT Services' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'TC-SI' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Software industry' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  sectorId: number;
}

export class UpdateIndustryDto {
  @ApiPropertyOptional({ example: 'Software & IT Services' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'TC-SI' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Software industry' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  sectorId?: number;
}
