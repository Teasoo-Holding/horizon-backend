import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse
} from '@nestjs/swagger';
import { AdminSettingsService } from './admin-settings.service';
import { JwtRolesGuard, Roles } from 'src/auth/guards/jwtroles.guard';
import {
  UpdateNotificationSettingsDto,
  UpdateSecuritySettingsDto,
  UpdateSystemSettingsDto,
  ChangePasswordDto,
  AdminSettingsResponseDto
} from './dto/admin-settings.dto';
import { RequestWithUser } from 'src/user/user.controller';

@ApiTags('Admin Settings')
@ApiBearerAuth()
@UseGuards(JwtRolesGuard)
@Roles('super_admin')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly service: AdminSettingsService) { }

  @Get()
  @ApiOperation({ summary: 'Get global admin settings (Notifications, Security, Data Management)' })
  @ApiResponse({ type: AdminSettingsResponseDto })
  async getSettings() {
    return this.service.getSettings();
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update global notification preferences for all platform admins' })
  async updateNotifications(
    @Body() dto: UpdateNotificationSettingsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.updateNotifications(dto, req.user.email, req.user.id);
  }

  @Patch('security')
  @ApiOperation({ summary: 'Update global security policies (2FA, login alerts)' })
  async updateSecurity(
    @Body() dto: UpdateSecuritySettingsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.updateSecurity(dto, req.user.email, req.user.id);
  }

  @Patch('system')
  @ApiOperation({ summary: 'Update platform-wide settings (Auto-backup, Data Retention)' })
  async updateSystem(
    @Body() dto: UpdateSystemSettingsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.updateSystem(dto, req.user.email, req.user.id);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change current admin password' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.changePassword(dto, req.user.id, req.user.email);
  }

  @Post('export-data')
  @ApiOperation({ summary: 'Trigger platform data export' })
  async exportData() {
    // Placeholder for data export logic - gotta plan this first
    return { message: 'Data export initiated. You will receive an email when it is ready.' };
  }
}
