import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  ValidateNested,
  IsArray,
  IsDate,
  IsBoolean
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

class Scope1UpdateDto {
  @IsInt()
  @IsOptional()
  ghgDataId?: number;

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
  @Type(() => Scope1UpdateDto)
  scope1?: Scope1UpdateDto | null;
}

class DisclosureTopicDto {
  @IsInt()
  @IsOptional()
  assessmentId?: number;

  @IsEnum(DisclosureCategory)
  @IsOptional()
  category?: DisclosureCategory;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  subtopic?: string;

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

export class UpdateAssessmentDto {
  @IsString()
  @IsOptional()
  subsidiary?: string;

  @IsString()
  @IsOptional()
  reportingPeriod?: string;

  @IsEnum(AssessmentStatus)
  @IsOptional()
  status?: AssessmentStatus;

  @IsInt()
  @IsOptional()
  createdById?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  completedAt?: Date | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DisclosureTopicDto)
  disclosureTopics?: DisclosureTopicDto[];
}
