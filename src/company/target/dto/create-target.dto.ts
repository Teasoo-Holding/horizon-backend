import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsObject,
  ValidateNested,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScopeReductionDto {
  @ApiProperty({
    description: 'Reduction percentage for the scope',
    example: 40.0,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  reductionPercentage: number;

  @ApiPropertyOptional({
    description: 'Baseline year emission value for this scope',
    example: 2500.5,
  })
  @IsNumber()
  @IsOptional()
  baselineYearEmission?: number;

  @ApiPropertyOptional({
    description: 'Target emission value for this scope',
    example: 1500.2,
  })
  @IsNumber()
  @IsOptional()
  targetEmission?: number;

  @ApiPropertyOptional({
    description: 'Current emission value for this scope',
    example: 1800.7,
  })
  @IsNumber()
  @IsOptional()
  currentEmission?: number;
}

export class ScopesDto {
  @ApiProperty({ type: ScopeReductionDto })
  @ValidateNested()
  @Type(() => ScopeReductionDto)
  scope1: ScopeReductionDto;

  @ApiProperty({ type: ScopeReductionDto })
  @ValidateNested()
  @Type(() => ScopeReductionDto)
  scope2: ScopeReductionDto;

  @ApiProperty({ type: ScopeReductionDto })
  @ValidateNested()
  @Type(() => ScopeReductionDto)
  scope3: ScopeReductionDto;
}

export class BaseTargetDto {
  @ApiProperty({
    description: 'Name of the target',
    example: '2030 Net Zero Target',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the target',
    example: 'Overall company emissions reduction target for 2030',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Baseline year for emissions calculation',
    example: 2024,
    minimum: 2000,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  baselineYear: number;

  @ApiProperty({
    description: 'Target year for emissions reduction',
    example: 2030,
    minimum: 2000,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  targetYear: number;
}

// Use ApiProperty on all properties for CreateGeneralTargetDto
export class CreateGeneralTargetDto {
  @ApiProperty({
    description: 'Name of the target',
    example: '2030 Net Zero Target',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the target',
    example: 'Overall company emissions reduction target for 2030',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Baseline year for emissions calculation',
    example: 2024,
    minimum: 2000,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  baselineYear: number;

  @ApiProperty({
    description: 'Target year for emissions reduction',
    example: 2030,
    minimum: 2000,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  targetYear: number;

  @ApiProperty({
    description: 'Type of target',
    enum: ['GENERAL'],
    example: 'GENERAL',
  })
  @IsEnum(['GENERAL'])
  type: 'GENERAL';

  @ApiProperty({
    description: 'Overall reduction percentage',
    example: 45.5,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  reductionPercentage: number;

  @ApiPropertyOptional({
    description: 'Baseline year emission value',
    example: 5000.0,
  })
  @IsNumber()
  @IsOptional()
  baselineYearEmission?: number;

  @ApiPropertyOptional({
    description: 'Target emission value',
    example: 3000.0,
  })
  @IsNumber()
  @IsOptional()
  targetEmission?: number;

  @ApiPropertyOptional({
    description: 'Current emission value',
    example: 3500.0,
  })
  @IsNumber()
  @IsOptional()
  currentEmission?: number;
}

export class CreateScopeTargetDto {
  @ApiProperty({
    description: 'Name of the target',
    example: 'Scope-based Reduction Target',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the target',
    example: 'Scope-specific emissions reduction targets',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Baseline year for emissions calculation',
    example: 2024,
    minimum: 2000,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  baselineYear: number;

  @ApiProperty({
    description: 'Target year for emissions reduction',
    example: 2030,
    minimum: 2000,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  targetYear: number;

  @ApiProperty({
    description: 'Type of target',
    enum: ['SCOPE'],
    example: 'SCOPE',
  })
  @IsEnum(['SCOPE'])
  type: 'SCOPE';

  @ApiProperty({
    description: 'Scope-specific reduction data',
    type: ScopesDto,
  })
  @ValidateNested()
  @Type(() => ScopesDto)
  scopes: ScopesDto;
}

export type CreateTargetData = CreateGeneralTargetDto | CreateScopeTargetDto;