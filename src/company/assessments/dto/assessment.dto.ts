import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssessmentPayloadDto {
  [key: string]: any;
  
  @ApiProperty({
    description: 'The subsidiary for which the assessment is being conducted.',
    example: 'HQ',
  })
  @IsNotEmpty()
  @IsString()
  subsidiary: string;

  @ApiProperty({
    description: 'The start month of the assessment period.',
    example: 'January',
  })
  @IsNotEmpty()
  @IsString()
  startMonth: string;

  @ApiProperty({
    description: 'The start year of the assessment period.',
    example: '2023',
  })
  @IsNotEmpty()
  @IsString()
  startYear: string;

  @ApiProperty({
    description: 'The end month of the assessment period.',
    example: 'December',
  })
  @IsNotEmpty()
  @IsString()
  endMonth: string;

  @ApiProperty({
    description: 'The end year of the assessment period.',
    example: '2023',
  })
  @IsNotEmpty()
  @IsString()
  endYear: string;

  @ApiProperty({
    description: 'Assessment data for stationary sources',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  stationarySources?: any;

  @ApiProperty({
    description: 'Assessment data for mobile sources',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  mobileSources?: any;

  @ApiProperty({
    description: 'Assessment data for process emissions',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  processEmissions?: any;

  @ApiProperty({
    description: 'Assessment data for fugitive emissions',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  fugitiveEmissions?: any;

  @ApiProperty({
    description:
      'Assessment data for Scope 2 electricity/cooling/steam/heating',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  electricity?: any;

  @IsOptional()
  @IsObject()
  cooling?: any;

  @IsOptional()
  @IsObject()
  steam?: any;

  @IsOptional()
  @IsObject()
  heating?: any;

  @IsOptional()
  @IsObject()
  ipps?: any;

  @IsOptional()
  @IsObject()
  eac?: any;

  @IsOptional()
  @IsObject()
  residual?: any;

  @IsOptional()
  @IsObject()
  coolingSteam?: any;

  @IsOptional()
  @IsString()
  lastSavedForm?: string;

  @IsOptional()
  @IsString()
  rejection_reason?: string;
}
