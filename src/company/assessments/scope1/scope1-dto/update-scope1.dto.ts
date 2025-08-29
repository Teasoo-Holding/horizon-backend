import {
  IsInt,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsString,
  IsEnum
} from 'class-validator';
import { File } from '../../common/file.interface';
import { FuelType } from '@prisma/client';
import { Type } from 'class-transformer';

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
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  files?: File[] | null;
}

class FileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  url: string;
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

export class UpdateScope1Dto {
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
