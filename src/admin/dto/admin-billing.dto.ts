import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';
import { BillingCycle, SubscriptionStatus, InvoiceStatus } from '@prisma/client';

export class BillingStatsResponse {
  @ApiProperty({ example: 2400000 })
  monthlyRevenue: number;

  @ApiProperty({ example: 12 })
  monthlyRevenueGrowth: number;

  @ApiProperty({ example: 21 })
  activeSubscriptions: number;

  @ApiProperty({ example: 7 })
  activeSubscriptionsGrowth: number;

  @ApiProperty({ example: 3 })
  pendingPaymentsCount: number;

  @ApiProperty({ example: 183000 })
  pendingPaymentsAmount: number;

  @ApiProperty({ example: 12 })
  overallGrowthRate: number;
}

export class SubscriptionListItem {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'EcoFriendly Manufacturing' })
  companyName: string;

  @ApiProperty({ example: 'Enterprise' })
  plan: string;

  @ApiProperty({ example: 'Yearly', enum: ['Monthly', 'Yearly'] })
  billing: string;

  @ApiProperty({ example: 38800 })
  amount: number;

  @ApiProperty({ example: '2024-01-01' })
  lastPayment: string;

  @ApiProperty({ example: '2025-01-01' })
  nextPayment: string;

  @ApiProperty({ example: 'Active', enum: ['Active', 'Expired', 'Cancelled', 'Trial'] })
  status: string;
}

export class CreateSubscriptionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  company_id: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  subscription_id: number;

  @ApiProperty({ example: '2024-04-20T00:00:00Z' })
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({ example: '2025-04-20T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ enum: ['MONTHLY', 'YEARLY'], example: 'YEARLY' })
  @IsEnum(['MONTHLY', 'YEARLY'])
  billing_cycle: 'MONTHLY' | 'YEARLY';

  @ApiProperty({ example: 38800 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;

  @ApiPropertyOptional({ example: 'Sarah Johnson' })
  @IsOptional()
  @IsString()
  billing_contact_name?: string;

  @ApiPropertyOptional({ example: 'billing@greenenergy.com' })
  @IsOptional()
  @IsString()
  billing_contact_email?: string;

  @ApiPropertyOptional({ example: '123 Green St, Eco City, EC 12345' })
  @IsOptional()
  @IsString()
  billing_address?: string;
}

export class UpdateSubscriptionDto extends CreateSubscriptionDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL'])
  status?: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'TRIAL';
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  company_id: number;

  @ApiProperty({ example: 'PMT-1562792781478' })
  @IsString()
  invoice_id: string;

  @ApiProperty({ example: 38800 })
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: ['PAID', 'PENDING', 'OVERDUE', 'CANCELLED'], example: 'PAID' })
  @IsEnum(['PAID', 'PENDING', 'OVERDUE', 'CANCELLED'])
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';

  @ApiProperty({ example: '2024-04-20T00:00:00Z' })
  @IsDateString()
  billing_date: string;

  @ApiPropertyOptional({ example: '2025-04-20T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  next_payment_date?: string;

  @ApiPropertyOptional({ example: 'https://storage.com/invoices/123.pdf' })
  @IsOptional()
  @IsString()
  download_url?: string;
}

export class UpdateInvoiceStatusDto {
  @ApiProperty({ enum: ['PAID', 'PENDING', 'OVERDUE', 'CANCELLED'] })
  @IsEnum(['PAID', 'PENDING', 'OVERDUE', 'CANCELLED'])
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
}
