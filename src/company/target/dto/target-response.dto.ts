import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class GeneralTargetResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 45.5 })
  reductionPercentage: number;

  @ApiProperty({ example: 5000.0 })
  baselineYearEmission: number;

  @ApiProperty({ example: 3000.0 })
  targetEmission: number;

  @ApiPropertyOptional({ example: 3500.0 })
  currentEmission?: number;
}

class ScopeTargetResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    enum: ['SCOPE1', 'SCOPE2', 'SCOPE3'],
    example: 'SCOPE1',
  })
  scope: 'SCOPE1' | 'SCOPE2' | 'SCOPE3';

  @ApiProperty({ example: 40.0 })
  reductionPercentage: number;

  @ApiProperty({ example: 2500.5 })
  baselineYearEmission: number;

  @ApiProperty({ example: 1500.2 })
  targetEmission: number;

  @ApiPropertyOptional({ example: 1800.7 })
  currentEmission?: number;

  @ApiPropertyOptional({ example: 2024 })
  baselineYear?: number | null;

  @ApiPropertyOptional({ example: 2030 })
  targetYear?: number | null;
}

export class TargetResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  companyId: number;

  @ApiProperty({ example: '2030 Net Zero Target' })
  name: string;

  @ApiProperty({
    enum: ['GENERAL', 'SCOPE'],
    example: 'GENERAL',
  })
  type: 'GENERAL' | 'SCOPE';

  @ApiProperty({ example: 1 })
  createdById: number;

  @ApiPropertyOptional({
    example: 'Overall company emissions reduction target',
  })
  description?: string;

  @ApiProperty({ example: 2024 })
  baselineYear: number;

  @ApiProperty({ example: 2030 })
  targetYear: number;

  @ApiPropertyOptional({ example: 2024 })
  currentAssessmentYear?: number | null;

  @ApiPropertyOptional({ example: '2025-03-10T09:00:00.000Z', description: 'ISO date of the baseline assessment (first approved/submitted assessment of baselineYear)' })
  baselineDate?: string | null;

  @ApiPropertyOptional({ example: '2026-03-10T09:00:00.000Z', description: 'ISO date of the current/latest assessment' })
  currentDate?: string | null;

  @ApiPropertyOptional({ type: GeneralTargetResponseDto })
  generalTarget?: GeneralTargetResponseDto;

  @ApiPropertyOptional({ type: [ScopeTargetResponseDto] })
  scopeTargets?: ScopeTargetResponseDto[];

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: Date;
}

export class DeleteResponseDto {
  @ApiProperty({ example: 'Target deleted successfully' })
  message: string;
}
