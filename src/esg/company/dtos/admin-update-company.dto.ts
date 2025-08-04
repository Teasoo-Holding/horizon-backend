import { IsOptional, IsBoolean, IsEnum, IsString } from 'class-validator';

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export class AdminUpdateCompanyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
