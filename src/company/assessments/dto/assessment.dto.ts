import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssessmentPayloadDto {
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
    description:
      'JSON object containing all detailed assessment data for stationary sources.',
    example: {
      electricityHeat: {
        dieselGenerators: [
          {
            fuelType: 'Diesel (HFO)',
            volume: '5000',
            unit: 'litres',
            source: 'Generator 1',
            emissionFactor: 2.7,
          },
        ],
      },
    },
    type: 'object',
    additionalProperties: true, // This line fixes the TypeScript error
  })
  @IsOptional()
  @IsObject()
  stationarySources?: any;

  // Future scopes will be included here with their own API properties
}
