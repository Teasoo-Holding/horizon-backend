import { IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PartialAssessmentPayloadDto {
  @ApiProperty({
    description: 'JSON path to the assessment data section being updated',
    example: 'environment.ghg.scope1.stationarySources.electricityHeat.dieselGenerators',
    type: String,
  })
  @IsString()
  path: string;

  @ApiProperty({
    description: 'Data payload to save at the specified path',
    example: { 'dieselGenerators': [{ 'fuelType': 'diesel-ago', 'volume': 100, 'unit': 'litre' }] },
    type: Object,
  })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Name of the form/section that was last saved (optional)',
    example: 'ghg-scope1-stationary-electricity-heat',
    type: String,
  })
  @IsOptional()
  @IsString()
  lastSavedForm?: string;
}
