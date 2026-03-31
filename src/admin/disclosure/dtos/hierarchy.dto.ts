import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsJSON, IsOptional, IsString } from 'class-validator';
import { DisclosureInputType } from '@prisma/client';

export class CreateSectorDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateIndustryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsInt()
  sectorId: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreatePillarDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class CreateTopicDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsInt()
  pillarId: number;

  @ApiProperty()
  @IsInt()
  industryId: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class CreateSubtopicDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsInt()
  topicId: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class CreateMetricDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsInt()
  subtopicId: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class CreateSubmetricDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsInt()
  metricId: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class CreateSubmetricDetailDto {
  @ApiProperty()
  @IsInt()
  submetricId: number;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty({ enum: DisclosureInputType })
  @IsEnum(DisclosureInputType)
  inputType: DisclosureInputType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  helpText?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional()
  @IsJSON()
  @IsOptional()
  unitOptions?: any;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional()
  @IsJSON()
  @IsOptional()
  options?: any;

  @ApiPropertyOptional()
  @IsJSON()
  @IsOptional()
  emissionFactor?: any;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mappingKey?: string;
}

export class UpdateHierarchyDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  // Additional fields for specific updates can be added here
}
