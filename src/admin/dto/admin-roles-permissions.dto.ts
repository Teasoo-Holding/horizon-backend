import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsArray, IsBoolean } from 'class-validator';

export class CreatePermissionGroupDto {
  @ApiProperty({ example: 'Platform Config' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdatePermissionGroupDto {
  @ApiProperty({ example: 'System Configuration' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class PermissionGroupDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'User Management' })
  name: string;

  @ApiProperty({ type: () => [PermissionDto] })
  permissions: PermissionDto[];
}

export class PermissionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'invite_users' })
  key: string;

  @ApiProperty({ example: 'Invite users' })
  label: string;

  @ApiPropertyOptional({ example: 'Ability to send invites to new users' })
  description?: string;

  @ApiProperty({ example: 1 })
  groupId: number;
}

export class RoleListItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Super Admin' })
  name: string;

  @ApiPropertyOptional({ example: 'Full system access' })
  description?: string;

  @ApiProperty({ example: 'Active' })
  status: string;

  @ApiProperty({ example: 1 })
  usersAssigned: number;

  @ApiProperty({ example: 42 })
  permissionsCount: number;

  @ApiProperty({ example: 42 })
  totalPermissions: number;

  @ApiProperty({ type: [String], example: ['Full system access', 'Algorithm configuration'] })
  keyPermissions: string[];
}

export class CreateRoleDto {
  @ApiProperty({ example: 'Platform Sub-Admin' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Can manage most data but cannot delete users' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID of an existing role to copy permissions from' })
  @IsInt()
  @IsOptional()
  inheritFrom?: number;

  @ApiPropertyOptional({ type: [Number], example: [10, 11], description: 'Individual permissions to assign' })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  assignedPermissions?: number[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Updated Role Name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreatePermissionDto {
  @ApiProperty({ example: 'approve_reports' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'Approve Reports' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  groupId: number;

  @ApiPropertyOptional({ type: [Number], example: [1, 2], description: 'Roles to assign this permission to' })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  assignToRoles?: number[];
}

export class PermissionMatrixRowDto {
  @ApiProperty({ example: 1 })
  permissionId: number;

  @ApiProperty({ example: 'Invite users' })
  label: string;

  @ApiProperty({ example: 'User Management' })
  groupName: string;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' }, example: { "1": true, "2": false } })
  roleAssignments: Record<number, boolean>;
}

export class UpdateMatrixDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  roleId: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  permissionId: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}
