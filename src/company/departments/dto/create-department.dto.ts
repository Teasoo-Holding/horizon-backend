import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
export class CreateDepartmentDto {
  @ApiProperty({
    example: 'Sustainability Department',
    description: 'Department name',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({ example: 'Handles ESG strategy and reporting' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'The department lead id on this portal',
  })
  @IsOptional()
  leadId?: number;

  @ApiPropertyOptional({
    example: 'lead@company.com',
    description: 'Email of the department lead (for new user creation)',
  })
  @IsEmail()
  @IsOptional()
  leadEmail?: string;

  @ApiPropertyOptional({
    example: 'Jane Doe',
    description: 'Name of the department lead (for new user creation)',
  })
  @IsString()
  @IsOptional()
  leadName?: string;

  @ApiPropertyOptional({
    example: 'contact@company.com',
    description: 'Contact email',
  })
  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @ApiPropertyOptional({
    description: 'Name of the subsidiary this department belongs to',
    example: 'Lighthouse LLC',
  })
  @IsString()
  @IsOptional()
  subsidiaryName?: string;
}
