import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyType, SubscriptionStatus, UserStatus } from '@prisma/client';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function safePercentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function monthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short' });
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getSuperAdminDashboard(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: { select: { name: true } } },
    });

    if (!user || user.role.name !== 'super_admin') {
      throw new UnauthorizedException();
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);
    const sixtyDaysAgo = new Date(now.getTime() - 2 * THIRTY_DAYS_MS);
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalCompanies,
      previousTotalCompanies,
      activeUsers,
      activeUsersCurrentMonth,
      activeUsersPreviousMonth,
      totalCompaniesByType,
      recentActivities,
      pendingCompanyApprovals,
      expiredSubscriptions,
      activeSubscriptions,
      leaderboardCompanies,
      reportAssessments,
      dbPingStarted,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({
        where: {
          created_at: { lt: thirtyDaysAgo },
        },
      }),
      this.prisma.user.count({
        where: { status: { in: [UserStatus.active, UserStatus.approved] } },
      }),
      this.prisma.user.count({
        where: {
          status: { in: [UserStatus.active, UserStatus.approved] },
          created_at: { gte: startOfCurrentMonth },
        },
      }),
      this.prisma.user.count({
        where: {
          status: { in: [UserStatus.active, UserStatus.approved] },
          created_at: { gte: startOfPreviousMonth, lt: startOfCurrentMonth },
        },
      }),
      this.prisma.company.groupBy({
        by: ['company_type'],
        _count: { _all: true },
        where: {
          company_type: { in: [CompanyType.esg, CompanyType.investor, CompanyType.regulator] },
        },
      }),
      this.prisma.activities.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          company: { select: { id: true, name: true } },
          createdBy: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
      }),
      this.prisma.company.count({ where: { status: 'pending' } }),
      this.prisma.companySubscription.count({
        where: {
          OR: [
            { status: SubscriptionStatus.EXPIRED },
            { end_date: { lt: now } },
          ],
        },
      }),
      this.prisma.companySubscription.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.prisma.company.findMany({
        where: { company_type: CompanyType.esg },
        select: {
          id: true,
          name: true,
          industry: { select: { name: true } },
          assessments: {
            where: { report: { isNot: null } },
            select: {
              createdAt: true,
              report: { select: { esgScore: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 2,
          },
        },
      }),
      this.prisma.assessment.findMany({
        where: {
          submittedAt: { gte: new Date(now.getFullYear() - 1, now.getMonth() + 1, 1) },
        },
        select: { submittedAt: true },
      }),
      this.prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`,
    ]);

    const totalCompaniesChange = safePercentChange(totalCompanies, previousTotalCompanies);
    const activeUsersMoMGrowth = safePercentChange(
      activeUsersCurrentMonth,
      activeUsersPreviousMonth,
    );

    const last12Months = Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      return {
        key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
        month: monthLabel(monthDate),
        year: monthDate.getFullYear(),
        count: 0,
      };
    });

    for (const assessment of reportAssessments) {
      if (!assessment.submittedAt) continue;
      const key = `${assessment.submittedAt.getFullYear()}-${assessment.submittedAt.getMonth()}`;
      const monthBucket = last12Months.find((item) => item.key === key);
      if (monthBucket) monthBucket.count += 1;
    }

    const distributionMap = new Map(totalCompaniesByType.map((item) => [item.company_type, item._count._all]));
    const distributionTotal = Array.from(distributionMap.values()).reduce((sum, count) => sum + count, 0);
    const distributionPercent = (count: number): number =>
      distributionTotal === 0 ? 0 : Number(((count / distributionTotal) * 100).toFixed(1));

    const leaderboard = leaderboardCompanies
      .map((company) => {
        const latest = company.assessments[0]?.report?.esgScore;
        const previous = company.assessments[1]?.report?.esgScore;
        const trend =
          latest == null || previous == null ? null : Number((latest - previous).toFixed(2));
        return {
          companyId: company.id,
          organization: company.name,
          industry: company.industry?.name || 'Unknown',
          score: latest == null ? null : Number(latest.toFixed(2)),
          trend,
        };
      })
      .filter((item) => item.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((item, index) => ({ rank: index + 1, ...item }));

    const dbPingMs =
      Date.now() -
      new Date(
        dbPingStarted[0]?.now ?? now,
      ).getTime();

    return {
      stats: {
        totalCompanies: {
          count: totalCompanies,
          percentChangeVsPrevious30Days: totalCompaniesChange,
        },
        activeUsers: {
          count: activeUsers,
          monthOverMonthGrowthPercent: activeUsersMoMGrowth,
          thisMonthNewActiveUsers: activeUsersCurrentMonth,
          previousMonthNewActiveUsers: activeUsersPreviousMonth,
        },
        activeSubscriptions: {
          count: activeSubscriptions,
        },
      },
      reportSubmissionsTimeSeries: last12Months.map(({ key: _key, ...rest }) => rest),
      userDistribution: {
        esgCompany: {
          count: distributionMap.get(CompanyType.esg) ?? 0,
          percent: distributionPercent(distributionMap.get(CompanyType.esg) ?? 0),
        },
        investor: {
          count: distributionMap.get(CompanyType.investor) ?? 0,
          percent: distributionPercent(distributionMap.get(CompanyType.investor) ?? 0),
        },
        regulator: {
          count: distributionMap.get(CompanyType.regulator) ?? 0,
          percent: distributionPercent(distributionMap.get(CompanyType.regulator) ?? 0),
        },
      },
      recentActivities: recentActivities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        type: activity.type,
        status: activity.status,
        createdAt: activity.createdAt,
        actor: {
          id: activity.createdBy.id,
          name:
            `${activity.createdBy.first_name ?? ''} ${activity.createdBy.last_name ?? ''}`.trim() ||
            activity.createdBy.email,
          email: activity.createdBy.email,
        },
        company: activity.company,
      })),
      pendingActions: {
        companiesAwaitingApproval: pendingCompanyApprovals,
        expiredSubscriptions,
        algorithmDrafts: 0,
      },
      esgLeaderboard: leaderboard,
      systemHealth: {
        api: {
          status: 'healthy',
          responseTimeMs: dbPingMs,
        },
        database: {
          status: dbPingMs < 500 ? 'healthy' : 'degraded',
          responseTimeMs: dbPingMs,
        },
        emailService: {
          status: process.env.BREVO_API_KEY ? 'healthy' : 'degraded',
        },
        scoringEngine: {
          activeVersion: null,
          status: 'pending_configuration',
        },
      },
      generatedAt: now,
      comparisonWindow: {
        currentStart: thirtyDaysAgo,
        previousStart: sixtyDaysAgo,
      },
    };
  }

}
