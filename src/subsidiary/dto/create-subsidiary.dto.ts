import { IsNotEmpty, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyStatus } from '@prisma/client';

export class CreateSubsidiaryDto {
  @ApiProperty({ description: 'Name of the subsidiary company' })
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Registration number of the company' })
  @IsOptional()
  registration_number?: string;

  @ApiProperty({ description: 'Industry sector the company operates in' })
  @IsNotEmpty()
  industry: string;

  @ApiPropertyOptional({ description: 'Physical address of the company' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Contact email address' })
  @IsEmail()
  @IsOptional()
  contact_email?: string;

  @ApiPropertyOptional({ description: 'Company website URL' })
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  contact_phone?: string;

  @ApiPropertyOptional({ description: 'URL to company logo image' })
  @IsOptional()
  company_logo_url?: string;

  @ApiPropertyOptional({ enum: CompanyStatus, description: 'Current status of the company' })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @ApiProperty({ description: 'ID of the parent company', example: 1 })
  @IsNotEmpty()
  parentCompanyId: number;

  @ApiProperty({ description: 'Email of the team lead', example: 'lead@example.com' })
  @IsNotEmpty()
  teamLeadEmail: string;
}