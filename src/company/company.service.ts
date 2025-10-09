import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { CompanyStatus } from '@prisma/client';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}
  async findAll() {
    return this.prisma.company.findMany({
      include: {
        industry: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }
  async findById(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        industry: true,
      },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }
  async updateStatus(id: number, status: CompanyStatus) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        industry: true,
        users: {
          where: { role: { name: 'company_esg_admin' } },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.status === status) {
      return {
        message: `No change — company is already ${status}`,
        company,
      };
    }

    await this.prisma.company.update({
      where: { id },
      data: { status },
    });

    if (status === CompanyStatus.active) {
      const esgAdmin = company.users[0];

      if (esgAdmin) {
        await this.prisma.user.update({
          where: { id: esgAdmin.id },
          data: { status: 'active' },
        });

        await this.emailService.sendEmail(
          String(esgAdmin.email),
          {
            firstname: esgAdmin.first_name,
            company_name: company.name,
          },
          9,
        );
      }
    }

    return {
      message: `Company status updated to ${status}`,
    };
  }

  async update(
    id: number,
    dto: Partial<UpdateCompanyDto> & { updated_by: number },
  ) {
    const { industryId, ...rest } = dto;

    return this.prisma.company.update({
      where: { id },
      data: {
        ...rest,
        ...(industryId && {
          industry: {
            connect: { id: industryId },
          },
        }),
      } as any,
      include: {
        industry: true,
      },
    });
  }

  async getDashboard(companyId: number) {
    try {
      // ✅ Get the most recent "submitted" or "reviewed" assessment
      const latestAssessment = await this.prisma.assessment.findFirst({
        where: {
          companyId,
          status: { in: ['submitted', 'reviewed'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      const parseAssessmentData = (raw: any) => {
        if (!raw) return null;
        try {
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          return null;
        }
      };

      // ✅ Extract nested totals safely
      const extractTotals = (assessment: any) => {
        const data = parseAssessmentData(assessment?.assessmentData);
        const totals = data?.totals?.totals ?? data?.totals ?? null;
        return totals;
      };

      const latestTotals = extractTotals(latestAssessment);

      // ✅ Overall ESG Score — for now, just from Environment
      const overallScore =
        latestTotals?.sum ??
        latestTotals?.overall ??
        latestTotals?.total ??
        latestTotals?.esgTotal ??
        null;

      // ✅ Breakdown (we only have Environment for now)
      const breakdown = {
        environment: latestTotals?.sum ?? 0,
        social: 0,
        governance: 0,
      };

      // ✅ Activities
      const activities = await this.prisma.activities.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          createdAt: true,
        },
      });

      const recentActivities = (activities ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description ?? '',
        type: a.type ?? null,
        status: a.status ?? null,
        date: a.createdAt,
      }));

      // ✅ Subscription
      const companySub = await this.prisma.companySubscription.findFirst({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' },
        include: { Subscription: true },
      });

      const subscriptionDto = companySub
        ? {
            tier: companySub.Subscription.name,
            amount: companySub.Subscription.price_monthly,
            dueDate: companySub.end_date,
            status: companySub.status,
          }
        : null;

      // ✅ ESG Journey – derive from submitted assessments
      const reviewedAssessments = await this.prisma.assessment.findMany({
        where: {
          companyId,
          status: { in: ['submitted', 'reviewed'] },
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, assessmentData: true },
      });

      const monthlyMap = new Map<string, number | null>();
      for (const a of reviewedAssessments) {
        const created = a.createdAt as Date;
        const monthKey = created.toISOString().slice(0, 7); // YYYY-MM

        if (!monthlyMap.has(monthKey)) {
          const totals = extractTotals(a);
          const score =
            totals?.sum ??
            totals?.overall ??
            totals?.total ??
            totals?.esgTotal ??
            null;
          monthlyMap.set(monthKey, typeof score === 'number' ? score : null);
        }
      }

      const esgJourney = Array.from(monthlyMap.entries())
        .map(([month, score]) => ({
          month: new Date(`${month}-01`).toLocaleString('default', {
            month: 'short',
          }),
          score,
        }))
        .sort((a, b) => (a.month < b.month ? -1 : 1));

      // ✅ Stats
      const totalAssessmentsCount = await this.prisma.assessment.count({
        where: { companyId },
      });

      const reviewedCount = await this.prisma.assessment.count({
        where: { companyId, status: 'reviewed' },
      });

      return {
        overallScore: typeof overallScore === 'number' ? overallScore : null,
        breakdown,
        recentActivities,
        subscription: subscriptionDto,
        esgJourney,
        stats: {
          totalAssessments: totalAssessmentsCount,
          reviewedAssessments: reviewedCount,
        },
      };
    } catch (err) {
      console.error('Error building company dashboard', err);
      throw new InternalServerErrorException(
        'Failed to build company dashboard',
      );
    }
  }
}
