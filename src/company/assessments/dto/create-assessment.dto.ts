import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentDto {
  @ApiProperty({
    description: 'Name of the subsidiary or business unit for this assessment',
    example: 'Horizon ESG Solutions',
    type: String,
  })
  @IsString()
  subsidiary: string;

  @ApiProperty({
    description: 'Starting month for the assessment period',
    example: 'January',
    type: String,
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  })
  @IsString()
  startMonth: string;

  @ApiProperty({
    description: 'Starting year for the assessment period',
    example: '2024',
    type: String,
  })
  @IsString()
  startYear: string;

  @ApiProperty({
    description: 'Ending month for the assessment period',
    example: 'December',
    type: String,
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  })
  @IsString()
  endMonth: string;

  @ApiProperty({
    description: 'Ending year for the assessment period',
    example: '2024',
    type: String,
  })
  @IsString()
  endYear: string;
}
