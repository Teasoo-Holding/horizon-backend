// dto/update-target.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsObject, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateScopeReductionDto {
  @ApiPropertyOptional({
    description: 'Reduction percentage for the scope',
    example: 45.0,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  reductionPercentage?: number;

  @ApiPropertyOptional({
    description: 'Baseline year for this specific scope',
    example: 2024,
    minimum: 2000,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  baselineYear?: number;

  @ApiPropertyOptional({
    description: 'Target year for this specific scope',
    example: 2030,
    minimum: 2000,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  targetYear?: number;
}

export class UpdateScopesDto {
  @ApiPropertyOptional({ type: UpdateScopeReductionDto })
  @IsObject()
  @IsOptional()
  @Type(() => UpdateScopeReductionDto)
  scope1?: UpdateScopeReductionDto;

  @ApiPropertyOptional({ type: UpdateScopeReductionDto })
  @IsObject()
  @IsOptional()
  @Type(() => UpdateScopeReductionDto)
  scope2?: UpdateScopeReductionDto;

  @ApiPropertyOptional({ type: UpdateScopeReductionDto })
  @IsObject()
  @IsOptional()
  @Type(() => UpdateScopeReductionDto)
  scope3?: UpdateScopeReductionDto;
}

export class UpdateGeneralTargetData {
  @ApiPropertyOptional({
    description: 'Name of the target',
    example: 'Updated Target Name'
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the target',
    example: 'Updated description'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Baseline year for emissions calculation',
    example: 2024
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  baselineYear?: number;

  @ApiPropertyOptional({
    description: 'Target year for emissions reduction',
    example: 2035
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  targetYear?: number;

  @ApiPropertyOptional({
    description: 'Overall reduction percentage',
    example: 50.0
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  reductionPercentage?: number;

  @ApiPropertyOptional({
    description: 'Baseline year total emission (tCO₂e)',
    example: 100000,
  })
  @IsNumber()
  @IsOptional()
  baselineYearEmission?: number;

  @ApiPropertyOptional({
    description: 'Target year total emission (tCO₂e)',
    example: 77000,
  })
  @IsNumber()
  @IsOptional()
  targetEmission?: number;

  @ApiPropertyOptional({
    description: 'Current total emission (tCO₂e)',
    example: 90000,
  })
  @IsNumber()
  @IsOptional()
  currentEmission?: number;
}

export class UpdateScopeTargetData {
  @ApiPropertyOptional({
    description: 'Name of the target',
    example: 'Updated Scope Target Name'
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the target',
    example: 'Updated scope description'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Baseline year for emissions calculation',
    example: 2024
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  baselineYear?: number;

  @ApiPropertyOptional({
    description: 'Target year for emissions reduction',
    example: 2035
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  targetYear?: number;

  @ApiPropertyOptional({
    description: 'Scope-specific reduction percentages',
    type: UpdateScopesDto
  })
  @IsObject()
  @IsOptional()
  @Type(() => UpdateScopesDto)
  scopes?: UpdateScopesDto;
}

export type UpdateTargetData = UpdateGeneralTargetData | UpdateScopeTargetData;