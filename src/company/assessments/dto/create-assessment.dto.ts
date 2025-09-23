import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  ValidateNested,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { AssessmentStatus, DisclosureCategory, FuelType } from '@prisma/client';
import { File } from '../common/file.interface';
import { Type } from 'class-transformer';
class FileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  url: string;
}
class Scope1CreateDto {
  @IsInt()
  ghgDataId: number;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => StationarySourcesDto)
  stationarySources?: StationarySourcesDto | null;
}

class StationarySourcesDto {
  @IsBoolean()
  @IsOptional()
  completed?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ElectricityHeatDto)
  electricityHeat?: ElectricityHeatDto | null;
}

class ElectricityHeatDto {
  @IsOptional()
  @IsEnum(FuelType)
  dieselFuelType?: FuelType | null;

  @IsOptional()
  @IsInt()
  dieselVolume?: number | null;

  @IsOptional()
  @IsEnum(FuelType)
  gasFuelType?: FuelType | null;

  @IsOptional()
  @IsInt()
  gasVolume?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  files?: File[] | null;
}

class GhgDataDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => Scope1CreateDto)
  scope1?: Scope1CreateDto | null;
}

class DisclosureTopicDto {
  @IsInt()
  assessmentId: number;

  @IsEnum(DisclosureCategory)
  category: DisclosureCategory;

  @IsString()
  topic: string;

  @IsString()
  subtopic: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => GhgDataDto)
  ghgData?: GhgDataDto | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  airQualityData?: File[] | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  waterData?: File[] | null;
}

export class CreateAssessmentDto {
  @IsString()
  subsidiary: string;

  @IsString()
  reportingPeriod: string;

  @IsEnum(AssessmentStatus)
  @IsOptional()
  status?: AssessmentStatus;

  @IsInt()
  createdById: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DisclosureTopicDto)
  disclosureTopics?: DisclosureTopicDto[];
}
