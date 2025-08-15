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

  @ApiProperty({ example: 5, description: 'The department lead id on this portal' })
  leadId: number;

  @ApiPropertyOptional({
    example: 'contact@company.com',
    description: 'Contact email',
  })
  @IsOptional()
  @IsEmail()
  contact_email?: string;
}
