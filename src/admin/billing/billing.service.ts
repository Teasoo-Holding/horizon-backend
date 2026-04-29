import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { 
  CreateSubscriptionDto, 
  UpdateSubscriptionDto, 
  CreateInvoiceDto, 
  UpdateInvoiceStatusDto,
  BillingStatsResponse
} from '../dto/admin-billing.dto';
import { BillingCycle, SubscriptionStatus, InvoiceStatus } from '@prisma/client';

@Injectable()
export class AdminBillingService {
  constructor(private prisma: PrismaService) {}

  async getBillingStats(): Promise<BillingStatsResponse> {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    // 1. Monthly Revenue (Current)
    const currentMonthInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'PAID',
        billing_date: { gte: startOfCurrentMonth, lte: now }
      }
    });
    const monthlyRevenue = currentMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    // 2. Last Month Revenue (for growth)
    const lastMonthInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'PAID',
        billing_date: { gte: startOfLastMonth, lte: endOfLastMonth }
      }
    });
    const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const revenueGrowth = lastMonthRevenue === 0 ? 100 : ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

    // 3. Active Subscriptions
    const activeSubsCount = await this.prisma.companySubscription.count({
      where: { status: 'ACTIVE' }
    });
    const lastMonthActiveSubs = await this.prisma.companySubscription.count({
      where: { 
        status: 'ACTIVE',
        created_at: { lte: endOfLastMonth }
      }
    });
    const subsGrowth = lastMonthActiveSubs === 0 ? 100 : ((activeSubsCount - lastMonthActiveSubs) / lastMonthActiveSubs) * 100;

    // 4. Pending Payments
    const pendingPayments = await this.prisma.invoice.findMany({
      where: { status: 'PENDING' }
    });
    const pendingAmount = pendingPayments.reduce((sum, inv) => sum + inv.amount, 0);

    return {
      monthlyRevenue,
      monthlyRevenueGrowth: Math.round(revenueGrowth),
      activeSubscriptions: activeSubsCount,
      activeSubscriptionsGrowth: Math.round(subsGrowth),
      pendingPaymentsCount: pendingPayments.length,
      pendingPaymentsAmount: pendingAmount,
      overallGrowthRate: Math.round(revenueGrowth) // Using revenue growth as overall indicator
    };
  }

  async getSubscriptions(query: any) {
    const { page = 1, limit = 10, search, status, sector } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.Company = {
        name: { contains: search, mode: 'insensitive' }
      };
    }
    if (sector) {
      where.Company = {
        ...where.Company,
        industry: { sector }
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.companySubscription.findMany({
        where,
        include: {
          Company: {
            include: { industry: true }
          },
          Subscription: true
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      this.prisma.companySubscription.count({ where })
    ]);

    // Map to UI format
    const formattedItems = items.map(item => ({
      id: item.id,
      companyName: item.Company.name,
      plan: item.Subscription.name,
      billing: item.billing_cycle === 'YEARLY' ? 'Yearly' : 'Monthly',
      amount: item.amount,
      lastPayment: item.start_date.toISOString().split('T')[0],
      next_payment_date: item.end_date?.toISOString().split('T')[0] || '-',
      status: item.status.charAt(0) + item.status.slice(1).toLowerCase(),
    }));

    return { items: formattedItems, total, page, limit };
  }

  async createSubscription(dto: CreateSubscriptionDto, adminId: number) {
    return this.prisma.companySubscription.create({
      data: {
        company_id: dto.company_id,
        subscription_id: dto.subscription_id,
        start_date: new Date(dto.start_date),
        end_date: dto.end_date ? new Date(dto.end_date) : null,
        billing_cycle: dto.billing_cycle as BillingCycle,
        amount: dto.amount,
        auto_renew: dto.auto_renew ?? true,
        billing_contact_name: dto.billing_contact_name,
        billing_contact_email: dto.billing_contact_email,
        billing_address: dto.billing_address,
        created_by: adminId,
        updated_by: adminId,
        status: 'ACTIVE'
      }
    });
  }

  async updateSubscription(id: number, dto: UpdateSubscriptionDto, adminId: number) {
    const sub = await this.prisma.companySubscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');

    return this.prisma.companySubscription.update({
      where: { id },
      data: {
        ...dto,
        start_date: dto.start_date ? new Date(dto.start_date) : undefined,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
        billing_cycle: dto.billing_cycle as BillingCycle,
        updated_by: adminId
      }
    });
  }

  async deleteSubscription(id: number) {
    return this.prisma.companySubscription.delete({ where: { id } });
  }

  async getInvoices(company_id?: number) {
    const where = company_id ? { company_id } : {};
    return this.prisma.invoice.findMany({
      where,
      orderBy: { billing_date: 'desc' }
    });
  }

  async createInvoice(dto: CreateInvoiceDto) {
    return this.prisma.invoice.create({
      data: {
        ...dto,
        billing_date: new Date(dto.billing_date),
        next_payment_date: dto.next_payment_date ? new Date(dto.next_payment_date) : null,
        status: dto.status as InvoiceStatus
      }
    });
  }

  async updateInvoiceStatus(id: number, dto: UpdateInvoiceStatusDto) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: dto.status as InvoiceStatus }
    });
  }
}
