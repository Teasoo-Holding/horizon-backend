import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';

@ValidatorConstraint({ name: 'RoleMustBeProvided', async: false })
export class RoleMustBeProvidedConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any, args: ValidationArguments) {
    const obj = args.object as CreateInvitationDto;
    return (
      (typeof obj.roleId === 'number' && !isNaN(obj.roleId)) ||
      (typeof obj.roleName === 'string' && obj.roleName.length > 0)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments) {
    return 'Either roleId or roleName must be provided for the user';
  }
}
export class CreateInvitationDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @Validate(RoleMustBeProvidedConstraint, {
    message: 'Either roleId or roleName must be provided for the user.',
  })
  email: string;

  @ApiProperty({ example: 1, description: 'Role ID' })
  @IsInt()
  @IsOptional()
  roleId?: number;

  @ApiProperty({ example: 'company_esg_subadmin', description: 'Role name' })
  @IsString()
  @IsOptional()
  roleName?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  subsidiaryId?: number;

  @ApiPropertyOptional({ description: 'Name of the subsidiary to link to' })
  @IsString()
  @IsOptional()
  subsidiaryName?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional({ description: 'Name of the department to link to' })
  @IsString()
  @IsOptional()
  departmentName?: string;
}
