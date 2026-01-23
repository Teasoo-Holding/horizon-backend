import { ApiProperty } from '@nestjs/swagger';

export class ReportResponseDto {
  @ApiProperty({
    description: 'Activity metrics including production and asset portfolio data',
  })
  activityMetrics: Record<string, any>;

  @ApiProperty({
    description: 'Environmental assessment data including GHG emissions, air quality, water management, and biodiversity impact',
  })
  environmental: Record<string, any>;

  @ApiProperty({
    description: 'Social capital assessment data including community relations and security metrics',
  })
  socialCapital: Record<string, any>;

  @ApiProperty({
    description: 'Human capital assessment data including workforce health and safety metrics',
  })
  humanCapital: Record<string, any>;

  @ApiProperty({
    description: 'Business model and innovation assessment data',
  })
  businessModel: Record<string, any>;

  @ApiProperty({
    description: 'Leadership and governance assessment data',
  })
  leadershipAndGovernance: Record<string, any>;

  @ApiProperty({
    description: 'Emission percentage summary by scope',
  })
  percentage_emission_summary: Record<string, any>;

  @ApiProperty({
    description: 'Assessment status',
    example: 'submitted_approved',
  })
  status: string;

  @ApiProperty({
    description: 'Subsidiary name',
    example: 'Horizon ESG Solutions',
  })
  subsidiary: string;

  @ApiProperty({
    description: 'Report period start month',
    example: 'January',
  })
  startMonth: string;

  @ApiProperty({
    description: 'Report period start year',
    example: '2024',
  })
  startYear: string;

  @ApiProperty({
    description: 'Report period end month',
    example: 'December',
  })
  endMonth: string;

  @ApiProperty({
    description: 'Report period end year',
    example: '2024',
  })
  endYear: string;

  @ApiProperty({
    description: 'Carbon reduction targets',
  })
  targets: Record<string, any>;
}

export class ReportListResponseDto {
  @ApiProperty({
    description: 'List of assessment reports',
    type: [ReportResponseDto],
  })
  data: ReportResponseDto[];
}