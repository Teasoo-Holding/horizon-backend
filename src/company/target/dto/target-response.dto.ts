// dto/target-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class GeneralTargetResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 45.5 })
  reductionPercentage: number;
}

class ScopeTargetResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: ['SCOPE1', 'SCOPE2', 'SCOPE3'], example: 'SCOPE1' })
  scope: 'SCOPE1' | 'SCOPE2' | 'SCOPE3';

  @ApiProperty({ example: 40.0 })
  reductionPercentage: number;
}

export class TargetResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  companyId: number;

  @ApiProperty({ example: '2030 Net Zero Target' })
  name: string;

  @ApiProperty({ enum: ['GENERAL', 'SCOPE'], example: 'GENERAL' })
  type: 'GENERAL' | 'SCOPE';

  @ApiProperty({ example: 1 })
  createdById: number;

  @ApiPropertyOptional({ example: 'Overall company emissions reduction target' })
  description?: string;

  @ApiProperty({ example: 2024 })
  baselineYear: number;

  @ApiProperty({ example: 2030 })
  targetYear: number;

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