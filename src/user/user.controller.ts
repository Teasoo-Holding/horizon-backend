import { Controller, Get, Body, Patch, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { RoleName } from '@prisma/client';
import { PLATFORM_ROLES, ALL_ROLES } from 'src/auth/roles/role.constants';
import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    role?: string;
    companyId?: number;
  };
}

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtRolesGuard)
  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user details' })
  getMe(@Req() req: RequestWithUser) {
    return this.userService.findMe(Number(req.user.id));
  }

  @Patch('me')
  @UseGuards(JwtRolesGuard)
  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@Req() req: RequestWithUser, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateMe(Number(req.user.id), updateUserDto);
  }

  @Get('all')
  @UseGuards(JwtRolesGuard)
  @Roles(...PLATFORM_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users on the platform (platform roles only)' })
  async getAllPlatformUsers() {
    return this.userService.getAllPlatformUsers();
  }
  
  @Get('user-roles')
  @UseGuards(JwtRolesGuard)
  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users roles' })
  async getAllUserRoles() {
    return this.userService.getAllUserRoles();
  }

  @Get('dashboard')
  @UseGuards(JwtRolesGuard)
  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user dashboard data' })
  async getUserDashboard(@Req() req: RequestWithUser) {
    return this.userService.getEsgDashboard(Number(req.user.id));
  }
}
