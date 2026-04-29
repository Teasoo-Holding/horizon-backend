import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CompanyStatus, CompanyType } from '@prisma/client';

export class AdminCompanyStatsDto {
  @ApiProperty({ example: 25 })
  totalCompanies: number;

  @ApiProperty({ example: 4, description: 'Growth in total companies this month' })
  growthThisMonth: number;

  @ApiProperty({ example: 18 })
  approvedCount: number;

  @ApiProperty({ example: 5 })
  pendingReviewCount: number;

  @ApiProperty({ example: 2 })
  suspendedCount: number;
}

export class AdminCompanyListItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'GreenTech Solutions' })
  name: string;

  @ApiProperty({ example: 'https://example.com/logo.png' })
  logoUrl?: string;

  @ApiProperty({ enum: CompanyType, example: 'esg' })
  category: CompanyType;

  @ApiProperty({ example: 'Renewable Energy' })
  industry: string;

  @ApiProperty({ example: 'sarah@greentech.com' })
  contact: string;

  @ApiProperty({ example: 'Premium' })
  subscription: string;

  @ApiProperty({ example: 82, description: 'Latest ESG score percentage' })
  esgScore?: number;

  @ApiProperty({ enum: CompanyStatus, example: 'active' })
  status: CompanyStatus;
}

export class AdminCompanyDetailsDto extends AdminCompanyListItemDto {
  @ApiProperty({ example: 'www.greentech.com' })
  website?: string;

  @ApiProperty({ example: '(684) 555-0102' })
  phoneNumber?: string;

  @ApiProperty({ example: '20' })
  staffStrength?: string;

  @ApiProperty({ example: '555-0102' })
  registrationNumber?: string;

  @ApiProperty({ example: '2972 Westheimer Rd. Santa Ana, Illinois' })
  address?: string;
}

export class UpdateCompanyStatusDto {
  @ApiProperty({ enum: CompanyStatus, example: 'suspended' })
  @IsEnum(CompanyStatus)
  @IsNotEmpty()
  status: CompanyStatus;
}
