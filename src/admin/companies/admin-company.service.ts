import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { 
  AdminCompanyStatsDto, 
  AdminCompanyListItemDto, 
  AdminCompanyDetailsDto 
} from '../dto/admin-company.dto';
import { CompanyStatus } from '@prisma/client';

@Injectable()
export class AdminCompanyService {
  constructor(private prisma: PrismaService) {}

  async getStats(): Promise<AdminCompanyStatsDto> {
    const [total, approved, pending, suspended] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { status: 'active' } }),
      this.prisma.company.count({ where: { status: 'pending' } }),
      this.prisma.company.count({ where: { status: 'suspended' } }),
    ]);

    // Calculate growth (companies created in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const growthThisMonth = await this.prisma.company.count({
      where: { created_at: { gte: thirtyDaysAgo } },
    });

    return {
      totalCompanies: total,
      growthThisMonth,
      approvedCount: approved,
      pendingReviewCount: pending,
      suspendedCount: suspended,
    };
  }

  async getCompanies(query: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    industryId?: number;
    status?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { contact_email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.type) where.company_type = query.type;
    if (query.industryId) where.industryId = Number(query.industryId);
    if (query.status) where.status = query.status as CompanyStatus;

    const [total, companies] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          industry: true,
          subscription: true,
          assessments: {
            take: 1,
            include: { report: true },
            orderBy: { createdAt: 'desc' }
          }
        },
      }),
    ]);

    const items: AdminCompanyListItemDto[] = companies.map((c) => ({
      id: c.id,
      name: c.name,
      logoUrl: c.company_logo_url || undefined,
      category: c.company_type || 'esg',
      industry: c.industry?.industry || 'Unknown',
      contact: c.contact_email || 'N/A',
      subscription: c.subscription?.name || 'Free',
      esgScore: c.assessments[0]?.report?.esgScore || undefined,
      status: c.status,
    }));

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCompanyDetails(id: number): Promise<AdminCompanyDetailsDto> {
    const c = await this.prisma.company.findUnique({
      where: { id },
      include: {
        industry: true,
        subscription: true,
        assessments: {
          take: 1,
          include: { report: true },
          orderBy: { createdAt: 'desc' }
        }
      },
    });

    if (!c) throw new NotFoundException('Company not found');

    return {
      id: c.id,
      name: c.name,
      logoUrl: c.company_logo_url || undefined,
      category: c.company_type || 'esg',
      industry: c.industry?.industry || 'Unknown',
      contact: c.contact_email || 'N/A',
      subscription: c.subscription?.name || 'Free',
      esgScore: c.assessments[0]?.report?.esgScore || undefined,
      status: c.status,
      website: c.website || undefined,
      phoneNumber: c.contact_phone || undefined,
      staffStrength: c.staff_strength || undefined,
      registrationNumber: c.registration_number || undefined,
      address: c.address || undefined,
    };
  }

  async updateStatus(id: number, status: CompanyStatus, adminId: number) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    return this.prisma.company.update({
      where: { id },
      data: { 
        status,
        updated_by: adminId
      },
    });
  }
}
