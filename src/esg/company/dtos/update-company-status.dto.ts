import { IsEnum } from 'class-validator';

export enum CompanyStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class UpdateCompanyStatusDto {
  @IsEnum(CompanyStatus)
  status: CompanyStatus;
}
