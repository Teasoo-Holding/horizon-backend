import { IsOptional, IsString, MinLength, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Sustainability Department' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  leadId?: number;

  @ApiPropertyOptional({ example: 'contact@company.com' })
  @IsOptional()
  @IsEmail()
  contact_email?: string;
}
