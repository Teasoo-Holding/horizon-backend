// dto/create-target.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsObject, ValidateNested, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ScopeReductionDto {
  @ApiProperty({
    description: 'Reduction percentage for the scope',
    example: 40.0,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  reductionPercentage: number;
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
    example: '2030 Net Zero Target'
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the target',
    example: 'Overall company emissions reduction target for 2030'
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Baseline year for emissions calculation',
    example: 2024,
    minimum: 2000,
    maximum: 2100
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  baselineYear: number;

  @ApiProperty({
    description: 'Target year for emissions reduction',
    example: 2030,
    minimum: 2000,
    maximum: 2100
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  targetYear: number;
}

export class CreateGeneralTargetDto extends BaseTargetDto {
  @ApiProperty({
    description: 'Type of target',
    enum: ['GENERAL'],
    example: 'GENERAL'
  })
  @IsEnum(['GENERAL'])
  type: 'GENERAL';

  @ApiProperty({
    description: 'Overall reduction percentage',
    example: 45.5,
    minimum: 0,
    maximum: 100
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  reductionPercentage: number;
}

export class CreateScopeTargetDto extends BaseTargetDto {
  @ApiProperty({
    description: 'Type of target',
    enum: ['SCOPE'],
    example: 'SCOPE'
  })
  @IsEnum(['SCOPE'])
  type: 'SCOPE';

  @ApiProperty({
    description: 'Scope-specific reduction percentages',
    type: ScopesDto
  })
  @ValidateNested()
  @Type(() => ScopesDto)
  scopes: ScopesDto;
}

export type CreateTargetData = CreateGeneralTargetDto | CreateScopeTargetDto;