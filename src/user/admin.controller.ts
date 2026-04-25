import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { RoleName } from '@prisma/client';

export interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    role?: string;
    companyId?: number;
  };
}

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

 

  @Get('dashboard')
  @UseGuards(JwtRolesGuard)
  @Roles(RoleName.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get super admin dashboard data (super_admin-only)' })
  async getSuperAdminDashboard(@Req() req: RequestWithUser) {
    return this.adminService.getSuperAdminDashboard(Number(req.user.id));
  }
 
}
