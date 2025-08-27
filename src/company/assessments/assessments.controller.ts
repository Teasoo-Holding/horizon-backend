// dto/create-assessment.dto.ts
import { IsString, IsEnum, IsOptional, IsNumber, ValidateNested } from 'class-validator';

export enum MetricType {
  INDUSTRY_SPECIFIC = 'INDUSTRY_SPECIFIC',
  SUPPLEMENTARY = 'SUPPLEMENTARY',
}

export class FileMetadataDto {
  @IsString()
  name: string;

  @IsNumber()
  size: number;

  @IsNumber()
  lastModified: number;
}

export class ElectricityHeatDto {
  @IsString()
  @IsOptional()
  dieselFuelType?: string;

  @IsNumber()
  @IsOptional()
  dieselVolume?: number;

  @IsString()
  @IsOptional()
  gasFuelType?: string;

  @IsNumber()
  @IsOptional()
  gasVolume?: number;

  @IsOptional()
  files?: Record<string, FileMetadataDto | null>;
}

export class StationarySourcesDto {
  @IsOptional()
  @ValidateNested()
  electricityHeat?: ElectricityHeatDto;
}

export class CreateAssessmentDto {
  @IsString()
  subsidiary: string;

  @IsString()
  startMonth: string;

  @IsString()
  startYear: string;

  @IsString()
  endMonth: string;

  @IsString()
  endYear: string;

  @IsEnum(MetricType)
  metricType: MetricType;

  @IsOptional()
  @ValidateNested()
  stationarySources?: StationarySourcesDto;
}
