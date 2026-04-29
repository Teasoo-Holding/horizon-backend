import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/admin/audit/audit.service';
import * as bcrypt from 'bcryptjs';
import { 
  UpdateNotificationSettingsDto, 
  UpdateSecuritySettingsDto, 
  UpdateSystemSettingsDto, 
  ChangePasswordDto 
} from './dto/admin-settings.dto';

@Injectable()
export class AdminSettingsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getSettings() {
    let settings = await this.prisma.systemSetting.findFirst();

    if (!settings) {
      // Initialize default settings if not exists
      settings = await this.prisma.systemSetting.create({
        data: {},
      });
    }

    return {
      notifications: {
        notify_new_company_reg: settings.notify_new_company_reg,
        notify_payment_failures: settings.notify_payment_failures,
        notify_report_submissions: settings.notify_report_submissions,
        notify_algorithm_draft_saved: settings.notify_algorithm_draft_saved,
        notify_weekly_summary: settings.notify_weekly_summary,
      },
      security: {
        two_factor_enforced: settings.two_factor_enforced,
        login_notifications_enabled: settings.login_notifications_enabled,
      },
      dataManagement: {
        auto_backup_enabled: settings.auto_backup_enabled,
        data_retention_period: settings.data_retention_period,
      },
      updatedAt: settings.updated_at,
    };
  }

  async updateNotifications(dto: UpdateNotificationSettingsDto, adminEmail: string, adminId: number) {
    const settings = await this.getSettingsRecord();
    
    const updated = await this.prisma.systemSetting.update({
      where: { id: settings.id },
      data: dto,
    });

    await this.auditService.log({
      userId: adminId,
      actorEmail: adminEmail,
      module: 'Settings',
      action: 'Update Notifications',
      entity: 'SystemSetting',
      status: 'Success',
      metadata: dto,
    });

    return updated;
  }

  async updateSecurity(dto: UpdateSecuritySettingsDto, adminEmail: string, adminId: number) {
    const settings = await this.getSettingsRecord();

    const updated = await this.prisma.systemSetting.update({
      where: { id: settings.id },
      data: dto,
    });

    await this.auditService.log({
      userId: adminId,
      actorEmail: adminEmail,
      module: 'Settings',
      action: 'Update Security Policies',
      entity: 'SystemSetting',
      status: 'Success',
      metadata: dto,
    });

    return updated;
  }

  async updateSystem(dto: UpdateSystemSettingsDto, adminEmail: string, adminId: number) {
    const settings = await this.getSettingsRecord();

    const updated = await this.prisma.systemSetting.update({
      where: { id: settings.id },
      data: dto,
    });

    await this.auditService.log({
      userId: adminId,
      actorEmail: adminEmail,
      module: 'Settings',
      action: 'Update System Data Management',
      entity: 'SystemSetting',
      status: 'Success',
      metadata: dto,
    });

    return updated;
  }

  async changePassword(dto: ChangePasswordDto, adminId: number, adminEmail: string) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!user || !user.password) {
      throw new NotFoundException('User not found or does not have a password');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      await this.auditService.log({
        userId: adminId,
        actorEmail: adminEmail,
        module: 'Settings',
        action: 'Change Password',
        entity: 'User',
        status: 'Failed',
        metadata: { reason: 'Incorrect current password' },
      });
      throw new UnauthorizedException('Incorrect current password');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    await this.auditService.log({
      userId: adminId,
      actorEmail: adminEmail,
      module: 'Settings',
      action: 'Change Password',
      entity: 'User',
      status: 'Success',
    });

    return { message: 'Password updated successfully' };
  }

  private async getSettingsRecord() {
    let settings = await this.prisma.systemSetting.findFirst();
    if (!settings) {
      settings = await this.prisma.systemSetting.create({ data: {} });
    }
    return settings;
  }
}
