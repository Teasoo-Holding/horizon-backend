import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
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
  PermissionGroupDto, 
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

  @Get('groups')
  @ApiOperation({ summary: 'Get permissions grouped by category' })
  @ApiResponse({ status: 200, type: [PermissionGroupDto] })
  async getGroups() {
    return this.rolesService.getPermissionGroups();
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
