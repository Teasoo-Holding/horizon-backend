import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete,
  Body, 
  Param, 
  UseGuards, 
  ParseIntPipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminRolesPermissionsService } from './roles-permissions.service';
import { 
  RoleListItemDto, 
  CreateRoleDto, 
  UpdateRoleDto,
  PermissionGroupDto, 
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
  CreatePermissionDto, 
  PermissionMatrixRowDto, 
  UpdateMatrixDto 
} from '../dto/admin-roles-permissions.dto';

@ApiTags('Admin Roles & Permissions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/roles-permissions')
export class AdminRolesPermissionsController {
  constructor(private readonly rolesService: AdminRolesPermissionsService) {}

  @Get('roles')
  @ApiOperation({ summary: 'Get list of roles with user/permission counts' })
  @ApiResponse({ status: 200, type: [RoleListItemDto] })
  async getRoles() {
    return this.rolesService.getRoles();
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a new administrative role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Patch('roles/:id')
  @ApiOperation({ summary: 'Update a role definition' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto
  ) {
    return this.rolesService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.deleteRole(id);
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get permissions grouped by category' })
  @ApiResponse({ status: 200, type: [PermissionGroupDto] })
  async getGroups() {
    return this.rolesService.getPermissionGroups();
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create a new permission group' })
  @ApiResponse({ status: 201, description: 'Group created' })
  async createGroup(@Body() dto: CreatePermissionGroupDto) {
    return this.rolesService.createPermissionGroup(dto);
  }

  @Patch('groups/:id')
  @ApiOperation({ summary: 'Update a permission group name' })
  @ApiResponse({ status: 200, description: 'Group updated' })
  async updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionGroupDto
  ) {
    return this.rolesService.updatePermissionGroup(id, dto);
  }

  @Delete('groups/:id')
  @ApiOperation({ summary: 'Delete an empty permission group' })
  @ApiResponse({ status: 200, description: 'Group deleted' })
  async deleteGroup(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.deletePermissionGroup(id);
  }

  @Post('permissions')
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({ status: 201, description: 'Permission created' })
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.rolesService.createPermission(dto);
  }

  @Get('matrix')
  @ApiOperation({ summary: 'Get the permission matrix (Roles vs Permissions)' })
  @ApiResponse({ status: 200, type: [PermissionMatrixRowDto] })
  async getMatrix() {
    return this.rolesService.getPermissionMatrix();
  }

  @Post('matrix')
  @ApiOperation({ summary: 'Update the permission matrix (Bulk Role Assignment)' })
  @ApiResponse({ status: 200, description: 'Matrix updated' })
  async updateMatrix(@Body() dto: UpdateMatrixDto) {
    return this.rolesService.updatePermissionMatrix(dto);
  }
}
