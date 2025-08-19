import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  ValidateIf,
  IsString,
} from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @ValidateIf((o) => !o.roleName)
  @ApiProperty({ example: 1, description: 'Role ID' })
  @IsInt()
  @IsOptional()
  roleId?: number;

  @ValidateIf((o) => !o.roleId)
  @ApiProperty({ example: 'company_esg_subadmin', description: 'Role name' })
  @IsString()
  @IsOptional()
  roleName?: string;
}
