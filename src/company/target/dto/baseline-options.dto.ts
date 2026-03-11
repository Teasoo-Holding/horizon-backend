import { ApiProperty } from '@nestjs/swagger';

export class BaselineOptionDto {
  @ApiProperty({ description: 'Assessment ID used as baseline', example: 123 })
  assessmentId: number;

  @ApiProperty({
    description: 'Reporting period start month',
    example: 'January',
  })
  startMonth: string;

  @ApiProperty({ description: 'Reporting period start year', example: '2024' })
  startYear: string;

  @ApiProperty({
    description: 'Reporting period end month',
    example: 'December',
  })
  endMonth: string;

  @ApiProperty({ description: 'Reporting period end year', example: '2024' })
  endYear: string;

  @ApiProperty({
    description: 'Total baseline emissions for the period',
    example: 26830.5,
  })
  totalEmission: number;

  @ApiProperty({ description: 'Whether a report exists for this assessment' })
  hasReport: boolean;

  @ApiProperty({ description: 'When the assessment was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the assessment was submitted for review', nullable: true })
  submittedAt: Date | null;

  @ApiProperty({ description: 'When the assessment was approved', nullable: true })
  approvedAt: Date | null;
}
