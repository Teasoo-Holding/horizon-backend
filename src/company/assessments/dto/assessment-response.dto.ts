import { ApiProperty } from '@nestjs/swagger';

export class AssessmentResponseDto {
  @ApiProperty({
    description: 'Assessment ID',
    example: 123,
  })
  id: number;

  @ApiProperty({
    description: 'Subsidiary or business unit name',
    example: 'Horizon ESG Solutions',
  })
  subsidiary: string;

  @ApiProperty({
    description: 'Assessment status',
    enum: ['in_progress', 'awaiting_review', 'submitted_approved', 'approved', 'declined'],
    example: 'in_progress',
  })
  status: string;

  @ApiProperty({
    description: 'Assessment start month',
    example: 'January',
  })
  startMonth: string;

  @ApiProperty({
    description: 'Assessment start year',
    example: '2024',
  })
  startYear: string;

  @ApiProperty({
    description: 'Assessment end month',
    example: 'December',
  })
  endMonth: string;

  @ApiProperty({
    description: 'Assessment end year',
    example: '2024',
  })
  endYear: string;

  @ApiProperty({
    description: 'Assessment progress percentage',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  progress: number;

  @ApiProperty({
    description: 'Assessment creation timestamp',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Assessment last update timestamp',
    format: 'date-time',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Assessment data (only included in detailed responses)',
    required: false,
  })
  assessmentData?: Record<string, any>;
}

export class AssessmentListResponseDto {
  @ApiProperty({
    description: 'List of assessments',
    type: [AssessmentResponseDto],
  })
  data: AssessmentResponseDto[];
}

export class AssessmentDetailResponseDto {
  @ApiProperty({
    description: 'Detailed assessment data',
    type: AssessmentResponseDto,
  })
  data: AssessmentResponseDto;
}

export class AssessmentSubmitResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Group submitted',
  })
  message: string;

  @ApiProperty({
    description: 'Updated assessment object',
  })
  assessment: Record<string, any>;

  @ApiProperty({
    description: 'Scope emission totals',
    properties: {
      scope1: { type: 'number', example: 100.5 },
      scope2: { type: 'number', example: 50.2 },
      scope3: { type: 'number', example: 25.8 },
      total: { type: 'number', example: 176.5 },
    },
  })
  scopeTotals: Record<string, any>;

  @ApiProperty({
    description: 'Assessment progress data',
  })
  progress: any[];

  @ApiProperty({
    description: 'Calculation totals and breakdowns',
  })
  totals: Record<string, any>;
}

export class AssessmentApprovalResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Assessment approved successfully.',
  })
  message: string;

  @ApiProperty({
    description: 'Updated assessment object',
  })
  data: AssessmentResponseDto;
}