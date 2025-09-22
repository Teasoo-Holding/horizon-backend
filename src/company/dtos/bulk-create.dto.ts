import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSubsidiaryDto } from '../subsidiary/dto/create-subsidiary.dto';
import { CreateDepartmentDto } from '../departments/dto/create-department.dto';
import { CreateInvitationDto } from '../sub-users/dto/invitation.dto';

export class BulkCreateDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateSubsidiaryDto)
  subsidiaries: CreateSubsidiaryDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateDepartmentDto)
  departments: CreateDepartmentDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateInvitationDto)
  users: CreateInvitationDto[];
}
