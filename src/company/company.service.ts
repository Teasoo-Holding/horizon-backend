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
  ) { }
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
      const latestAssessment = await this.prisma.assessment.findFirst({
        where: {
          companyId,
          status: {
            in: [
              AssessmentStatus.approved,
              AssessmentStatus.submitted_approved,
              AssessmentStatus.awaiting_review,
            ],
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const parseAssessmentData = (raw: any) => {
        if (!raw) return null;
        try {
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          return null;
        }
      };

      const extractTotals = (assessment: any) => {
        const data = parseAssessmentData(assessment?.assessmentData);
        if (!data) return null;
        return {
          total: data.totalEmission ?? 0,
          environment: data.environment?.totalEmission ?? data.totalEmission ?? 0,
          social: data.social?.totalEmission ?? 0,
          governance: data.governance?.totalEmission ?? 0,
        };
      };

      const latestTotals = extractTotals(latestAssessment);

      const getHubStats = (assessment: any) => {
        const data = parseAssessmentData(assessment?.assessmentData);
        if (!data) return null;

        const env = data.environment;
        const sections = [
          env?.ghg?.scope1,
          env?.ghg?.scope2,
          env?.ghg?.scope3,
          env?.airQuality?.airPollutantEmissions,
          env?.waterManagement?.waterAndProducedWaterManagement?.freshwaterWithdrawals,
          env?.waterManagement?.waterAndProducedWaterManagement?.producedWaterManagement,
          env?.waterManagement?.hydraulicFracturingImpacts?.chemicalDisclosure,
          env?.biodiversityImpact?.environmentalManagement?.environmentalManagementPolicies,
        ];

        const completedSections = sections.filter(s => s?.progress && s.progress > 0).length;

        return {
          environment: {
            progress: env?.progress ?? data.overallProgress ?? 0,
            completed: `${completedSections} of 8 sections completed`,
          },
          social: {
            progress: data.social?.progress ?? 0,
            completed: `0 sections completed`,
          },
          governance: {
            progress: data.governance?.progress ?? 0,
            completed: `0 sections completed`,
          },
        };
      };

      const hubStats = getHubStats(latestAssessment);

      const overallScore = latestTotals?.total ?? null;

      const breakdown = {
        environment: latestTotals?.environment ?? 0,
        social: latestTotals?.social ?? 0,
        governance: latestTotals?.governance ?? 0,
      };

      const activities = await this.prisma.activities.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
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

      const reviewedAssessments = await this.prisma.assessment.findMany({
        where: {
          companyId,
          status: {
            in: [
              AssessmentStatus.approved,
              AssessmentStatus.submitted_approved,
              AssessmentStatus.awaiting_review,
            ],
          },
        },
        orderBy: [{ startYear: 'asc' }, { startMonth: 'asc' }],
        select: {
          createdAt: true,
          assessmentData: true,
          startMonth: true,
          startYear: true,
          endMonth: true,
          endYear: true,
        },
      });

      const parseMonthNumber = (m?: string | null): number | null => {
        if (!m) return null;
        const trimmed = m.trim();
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 1 && num <= 12) return num;

        const short = trimmed.toLowerCase().slice(0, 3);
        const map: Record<string, number> = {
          jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
          jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
        };
        return map[short] ?? null;
      };

      const pad = (n: number | null): string => {
        if (n === null) return '--';
        return n < 10 ? `0${n}` : `${n}`;
      };

      const formatYearTwoDigits = (y?: string | null, createdAt?: Date) => {
        if (!y && createdAt) return createdAt.getFullYear().toString().slice(-2);
        if (!y) return '--';
        const yearNum = parseInt(y, 10);
        if (!isNaN(yearNum)) return yearNum.toString().slice(-2);
        return y.slice(-2);
      };

      const makePeriodKey = (
        sMonth?: string | null,
        sYear?: string | null,
        eMonth?: string | null,
        eYear?: string | null,
        createdAt?: Date,
      ) => {
        const sm = parseMonthNumber(sMonth);
        const em = parseMonthNumber(eMonth);
        const sy = sYear ?? null;
        const ey = eYear ?? null;

        const startMM = sm ?? (createdAt ? createdAt.getMonth() + 1 : null);
        const endMM = em ?? (createdAt ? createdAt.getMonth() + 1 : null);
        const startYY = formatYearTwoDigits(sy, createdAt);
        const endYY = formatYearTwoDigits(ey, createdAt);

        return `${pad(startMM)}/${startYY} - ${pad(endMM)}/${endYY}`;
      };

      const periodMap = new Map<
        string,
        { score: number | null; sortDate: Date | null }
      >();

      for (const a of reviewedAssessments) {
        const pm = parseMonthNumber(a.startMonth) ?? (a.createdAt as Date).getMonth() + 1;
        const py = a.startYear ? parseInt(a.startYear, 10) : (a.createdAt as Date).getFullYear();
        const sortDate = !isNaN(py) && pm ? new Date(py, (pm - 1), 1) : (a.createdAt as Date);

        const totals = extractTotals(a);
        const emissionFromAssessmentData = totals?.total ?? null;

        const periodKey = makePeriodKey(
          a.startMonth,
          a.startYear,
          a.endMonth,
          a.endYear,
          a.createdAt as Date,
        );

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, {
            score:
              typeof emissionFromAssessmentData === 'number'
                ? emissionFromAssessmentData
                : null,
            sortDate,
          });
        } else {
          const existing = periodMap.get(periodKey)!;
          if (existing.score === null && typeof emissionFromAssessmentData === 'number') {
            periodMap.set(periodKey, { score: emissionFromAssessmentData, sortDate });
          }
        }
      }

      const esgJourney = Array.from(periodMap.entries())
        .map(([period, { score, sortDate }]) => ({ period, score, sortDate }))
        .sort((a, b) => {
          if (!a.sortDate && !b.sortDate) return 0;
          if (!a.sortDate) return -1;
          if (!b.sortDate) return 1;
          return a.sortDate.getTime() - b.sortDate.getTime();
        })
        .map((p) => ({ period: p.period, score: p.score }));

      const totalAssessmentsCount = await this.prisma.assessment.count({
        where: { companyId },
      });

      const reviewedCount = await this.prisma.assessment.count({
        where: {
          companyId,
          status: {
            in: [
              AssessmentStatus.approved,
              AssessmentStatus.submitted_approved,
              AssessmentStatus.awaiting_review,
            ],
          },
        },
      });

      return {
        overallScore: typeof overallScore === 'number' ? overallScore : null,
        breakdown,
        recentActivities,
        subscription: subscriptionDto,
        esgJourney,
        hubStats,
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

  async getOnboardingProgress(companyId: number, userId: number) {
    const [company, user, subsidiaryCount, departmentCount, userCount, assessmentCount] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.subsidiary.count({ where: { parentCompanyId: companyId } }),
      this.prisma.department.count({ where: { companyId: companyId } }),
      this.prisma.user.count({ where: { companyId: companyId } }),
      this.prisma.assessment.count({ where: { companyId: companyId } }),
    ]);

    if (!company || !user) {
      throw new NotFoundException('Company or User not found');
    }

    // Item 1: Complete Organization & Personal Profile
    const isCompanyProfileComplete = !!(
      company.name &&
      company.registration_number &&
      company.industryId &&
      (company.country || company.address) &&
      company.contact_email &&
      company.company_logo_url
    );
    const isUserProfileComplete = !!(
      user.first_name &&
      user.last_name &&
      (user.profile_photo_url || user.phone_number)
    );
    const item1 = isCompanyProfileComplete && isUserProfileComplete;

    const item2 = subsidiaryCount > 0 || departmentCount > 0 || userCount > 1;

    const item3 = assessmentCount > 0;

    const item4 = user.has_viewed_dashboard;

    const progress = [item1, item2, item3, item4];
    const completedCount = progress.filter(Boolean).length;
    const progressPercent = Math.round((completedCount / progress.length) * 100);

    return {
      progressPercent,
      checklist: [
        { title: 'Complete Organization & Personal Profile', isCompleted: item1 },
        { title: 'Invite Your Teams, Set Up Departments & Subsidiaries', isCompleted: item2 },
        { title: 'Start First Assessment', isCompleted: item3 },
        { title: 'View ESG Dashboard', isCompleted: item4 },
      ],
    };
  }

  async markDashboardAsViewed(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { has_viewed_dashboard: true },
    });
  }
}
