import { IsString } from 'class-validator';

export class CreateAssessmentDto {
  @IsString() subsidiary: string;
  @IsString() startMonth: string;
  @IsString() startYear: string;
  @IsString() endMonth: string;
  @IsString() endYear: string;
}
