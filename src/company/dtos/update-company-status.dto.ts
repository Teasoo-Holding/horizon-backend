import { IsEnum } from 'class-validator';
import { CompanyStatus } from '@prisma/client';

export class UpdateCompanyStatusDto {
  @IsEnum(CompanyStatus)
  status: CompanyStatus;
}
