import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import { InviteUserDto, ListUsersDto, UpdateUserDto } from './dto/admin-users.dto';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { GetUserDecorator } from 'src/auth/decorators/getuser.decorator';

@ApiTags('Admin User Management')
@ApiBearerAuth()
@UseGuards(JwtRolesGuard)
@Roles('super_admin', 'platform_subadmin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get user count stats (total, admins, data officers, pending invites)' })
  async getStats() {
    return this.service.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'List all platform users with optional filters and pagination' })
  async listUsers(@Query() filters: ListUsersDto) {
    return this.service.listUsers(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user\'s full details including permissions' })
  @ApiParam({ name: 'id', type: Number })
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getUserById(id);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a new user. Defaults to Teasoo Consulting if no companyId provided.' })
  async inviteUser(
    @Body() dto: InviteUserDto,
    @GetUserDecorator() user: { role: string },
  ) {
    return this.service.inviteUser(dto, user.role);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend an active user' })
  @ApiParam({ name: 'id', type: Number })
  async suspendUser(@Param('id', ParseIntPipe) id: number) {
    return this.service.suspendUser(id);
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended user' })
  @ApiParam({ name: 'id', type: Number })
  async reactivateUser(@Param('id', ParseIntPipe) id: number) {
    return this.service.reactivateUser(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user\'s role, department, or company' })
  @ApiParam({ name: 'id', type: Number })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.service.updateUser(id, dto);
  }
}
