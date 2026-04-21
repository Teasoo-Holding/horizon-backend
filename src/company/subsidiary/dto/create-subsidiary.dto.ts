import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyStatus } from '@prisma/client';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUrl,
  IsInt,
  IsNumber,
  ValidateIf,
} from 'class-validator';
export class CreateSubsidiaryDto {
  @ApiProperty({
    description: 'The name of the subsidiary',
    example: 'Lighthouse LLC',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Email of the team lead',
    example: 'teamlead@example.com',
  })
  @IsOptional()
  @ValidateIf((o) => o.teamLead_email)
  @IsEmail()
  teamLead_email?: string;

  @ApiPropertyOptional({
    description: 'Phone number of the team lead',
    example: '+2348012345678',
  })
  @IsString()
  @IsOptional()
  teamLead_name?: string;

  @ApiPropertyOptional({
    description: 'Industry of the company',
    example: 'Information Technology',
  })
  @IsOptional()
  @IsNumber()
  industryId?: number;

  // Optional fields:

  @ApiProperty({
    description: 'Unique registration number',
    example: 'AC223903',
  })
  @IsString()
  @IsOptional()
  registration_number?: string;

  @ApiProperty({
    description: 'SIC code',
    example: '1234',
  })
  @IsString()
  @IsOptional()
  sicsCode?: string;

  @ApiPropertyOptional({ description: 'ISIN code', example: 'US1234567890' })
  @IsOptional()
  @IsString()
  isinCode?: string;

  @ApiProperty({ description: 'ISO country code', example: 'NG' })
  @IsString()
  @IsOptional()
  isoCountryCode?: string;

  @ApiProperty({
    description: 'Company address',
    example: '3 Olugbenga Street, Shagamu, Ogun State',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Country', example: 'Nigeria' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Currency used by the subsidiary',
    example: 'NGN',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Contact email',
    example: 'info@techsolutions.com',
  })
  @IsEmail()
  @IsOptional()
  contact_email?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://techsolutions.com',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+2348012345678',
  })
  @IsString()
  @IsOptional()
  contact_phone?: string;

  @ApiPropertyOptional({
    description: 'Company logo URL',
    example: 'https://cdn.example.com/logo.png',
  })
  @IsOptional()
  @IsUrl()
  company_logo_url?: string;

  @ApiProperty({ description: 'ID of the parent company', example: 1 })
  @IsInt()
  @IsOptional()
  parentCompanyId?: number;

  @ApiPropertyOptional({ description: 'User ID of the team lead', example: 2 })
  @IsOptional()
  @IsInt()
  leadId?: number;

  @ApiPropertyOptional({
    description: 'Status of the subsidiary',
    example: 'active',
  })
  @IsOptional()
  @IsString()
  status?: CompanyStatus;
}
