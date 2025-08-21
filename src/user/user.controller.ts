import { Controller, Get, Body, Patch, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user details' })
  getMe(@Req() req: RequestWithUser) {
    return this.userService.findMe(Number(req.user.id));
  }

  @Patch('me')
  @UseGuards(JwtRolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@Req() req: RequestWithUser, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateMe(Number(req.user.id), updateUserDto);
  }

  @Get('all')
  @UseGuards(JwtRolesGuard)
  @Roles('super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users on the platform (super_admin-only)' })
  async getAllPlatformUsers() {
    return this.userService.getAllPlatformUsers();
  }
  
  @Get('user-roles')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users roles' })
  async getAllUserRoles() {
    return this.userService.getAllUserRoles();
  }
}
