import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { UserStatus } from '@prisma/client';

export class ListUsersDto {
  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by user status', enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Filter by role name' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Rows per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class InviteUserDto {
  @ApiProperty({ example: 'user@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 2, description: 'Role ID to assign' })
  @IsInt()
  roleId: number;

  @ApiPropertyOptional({ example: 1, description: 'Department ID (optional)' })
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Company ID to assign the user to. Defaults to Teasoo Consulting if omitted.',
  })
  @IsOptional()
  @IsInt()
  companyId?: number;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  first_name?: string;
}

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ example: 3, description: 'New role ID' })
  @IsOptional()
  @IsInt()
  roleId?: number;

  @ApiPropertyOptional({ example: 5, description: 'New department ID' })
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional({ example: 2, description: 'New company ID' })
  @IsOptional()
  @IsInt()
  companyId?: number;
}
