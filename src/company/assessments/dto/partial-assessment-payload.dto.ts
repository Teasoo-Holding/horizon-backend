import { IsString, IsObject, IsOptional } from 'class-validator';

export class PartialAssessmentPayloadDto {
  @IsString()
  path: string;

  @IsObject()
  data: Record<string, any>;

  @IsOptional()
  @IsString()
  lastSavedForm?: string;
}
