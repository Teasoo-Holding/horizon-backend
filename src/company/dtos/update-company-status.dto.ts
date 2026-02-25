import { IsEnum } from 'class-validator';

export enum CompanyStatus {
  pending = 'pending',
  active = 'active',
  suspended = 'suspended',
}

export class UpdateCompanyStatusDto {
  @IsEnum(CompanyStatus)
  status: CompanyStatus;
}
