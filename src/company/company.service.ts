import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { AssessmentStatus, CompanyStatus } from '@prisma/client';
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
      const latestReviewed = await this.prisma.assessment.findFirst({
        where: {
          companyId,
          status: AssessmentStatus.reviewed,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Helper to safely extract numeric scores from assessmentData.totals
      const extractTotals = (assessment: any) => {
        if (!assessment || !assessment.assessmentData) return null;
        const data = assessment.assessmentData as any;
        const totals = data.totals ?? null;
        return totals;
      };

      const latestTotals: any = extractTotals(latestReviewed);

      const overallScore =
        latestTotals?.overall ??
        latestTotals?.total ??
        latestTotals?.esgTotal ??
        null;

      const breakdown = {
        environment:
          latestTotals?.environment ??
          latestTotals?.environmentTotal ??
          latestTotals?.env ??
          0,
        social:
          latestTotals?.social ??
          latestTotals?.socialTotal ??
          latestTotals?.soc ??
          0,
        governance:
          latestTotals?.governance ??
          latestTotals?.governanceTotal ??
          latestTotals?.gov ??
          0,
      };

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

      const companySub = await this.prisma.companySubscription.findFirst({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' },
        include: {
          Subscription: true,
        },
      });

      const subscriptionDto = companySub
        ? {
            tier: companySub.Subscription.name,
            amount: companySub.Subscription.price_monthly,
            dueDate: companySub.end_date,
            status: companySub.status,
          }
        : null;

      const reviewedAssessments = await this.prisma.assessment.findMany({
        where: {
          companyId,
          status: AssessmentStatus.submitted,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          assessmentData: true,
        },
      });

      const monthlyMap = new Map<string, number | null>();
      for (const a of reviewedAssessments) {
        const created = a.createdAt as Date;
        const monthKey = created.toISOString().slice(0, 7); // "YYYY-MM"

        if (!monthlyMap.has(monthKey)) {
          const totals = (a.assessmentData as any)?.totals ?? null;
          const score =
            totals?.overall ?? totals?.total ?? totals?.esgTotal ?? null;
          monthlyMap.set(monthKey, typeof score === 'number' ? score : null);
        }
      }

      const esgJourney = Array.from(monthlyMap.entries())
        .map(([month, score]) => ({ month, score }))
        .sort((a, b) => (a.month < b.month ? -1 : 1));

      const totalAssessmentsCount = await this.prisma.assessment.count({
        where: { companyId },
      });

      const dashboard = {
        overallScore: typeof overallScore === 'number' ? overallScore : null,
        breakdown,
        recentActivities,
        subscription: subscriptionDto,
        esgJourney,
        stats: {
          totalAssessments: totalAssessmentsCount,
          reviewedAssessments: reviewedAssessments.length,
        },
      };

      return dashboard;
    } catch (err) {
      console.error('Error building company dashboard', err);
      throw new InternalServerErrorException(
        'Failed to build company dashboard',
      );
    }
  }
}
