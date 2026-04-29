import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  notify_new_company_reg?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  notify_payment_failures?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  notify_report_submissions?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  notify_algorithm_draft_saved?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  notify_weekly_summary?: boolean;
}

export class UpdateSecuritySettingsDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  two_factor_enforced?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  login_notifications_enabled?: boolean;
}

export class UpdateSystemSettingsDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  auto_backup_enabled?: boolean;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  data_retention_period?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @ApiProperty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @ApiProperty()
  newPassword: string;

  @IsString()
  @MinLength(8)
  @ApiProperty()
  confirmPassword: string;
}

export class AdminSettingsResponseDto {
  @ApiProperty()
  notifications: {
    notify_new_company_reg: boolean;
    notify_payment_failures: boolean;
    notify_report_submissions: boolean;
    notify_algorithm_draft_saved: boolean;
    notify_weekly_summary: boolean;
  };

  @ApiProperty()
  security: {
    two_factor_enforced: boolean;
    login_notifications_enabled: boolean;
  };

  @ApiProperty()
  dataManagement: {
    auto_backup_enabled: boolean;
    data_retention_period: string;
  };
}
