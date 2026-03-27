import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { AssessmentStatus, CompanyStatus } from '@prisma/client';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

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

  // --- Dashboard Section Definitions (Aligned with frontend esgSectionCounts.ts) ---
  private readonly ESG_COUNTS = {
    E: 39,
    S: 9, // Social + Human
    G: 10, // Business + Leadership
    activityMetrics: 3,
    total: 61,
  };

  async getDashboard(companyId: number) {
    try {
      const latestAssessment = await this.prisma.assessment.findFirst({
        where: { companyId },
        orderBy: { updatedAt: 'desc' },
      });

      const latestReport = await this.prisma.report.findFirst({
        where: {
          assessment: {
            companyId,
            status: {
              in: [
                AssessmentStatus.approved,
                AssessmentStatus.submitted_approved,
              ],
            },
          },
        },
        orderBy: { id: 'desc' },
      });

      const parseAssessmentData = (raw: any) => {
        if (!raw) return null;
        try {
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          return null;
        }
      };

      const getHubStats = (assessment: any) => {
        const data = parseAssessmentData(assessment?.assessmentData);

        const envProgress = data?.environment?.progress ?? 0;
        const socialProgress = data?.socialCapital?.progress ?? 0;
        const humanProgress = data?.humanCapital?.progress ?? 0;
        const busProgress = data?.businessModel?.progress ?? data?.environment?.businessInnovation?.progress ?? 0;
        const leadProgress = data?.leadershipGovernance?.progress ?? 0;

        const combinedSocialProgress = (socialProgress + humanProgress) / 2;
        const combinedGovProgress = (busProgress + leadProgress) / 2;

        const envCompleted = Math.round((envProgress / 100) * this.ESG_COUNTS.E);
        const socialCompleted = Math.round((combinedSocialProgress / 100) * this.ESG_COUNTS.S);
        const govCompleted = Math.round((combinedGovProgress / 100) * this.ESG_COUNTS.G);

        const getPillarStatus = (progress: number): string => {
          if (progress >= 100) return 'completed';
          if (progress > 0) return 'in-progress';
          return 'not-started';
        };

        return {
          environment: {
            progress: Math.round(envProgress),
            completed: `${envCompleted} of ${this.ESG_COUNTS.E} sections completed`,
            status: getPillarStatus(envProgress),
          },
          social: {
            progress: Math.round(combinedSocialProgress),
            completed: `${socialCompleted} of ${this.ESG_COUNTS.S} sections completed`,
            status: getPillarStatus(combinedSocialProgress),
          },
          governance: {
            progress: Math.round(combinedGovProgress),
            completed: `${govCompleted} of ${this.ESG_COUNTS.G} sections completed`,
            status: getPillarStatus(combinedGovProgress),
          },
          totalCompleted: envCompleted + socialCompleted + govCompleted,
          totalSections: this.ESG_COUNTS.total,
        };
      };

      const hubStats = getHubStats(latestAssessment);

      const trendReports = await this.prisma.report.findMany({
        where: {
          assessment: {
            companyId,
            status: { in: [AssessmentStatus.approved, AssessmentStatus.submitted_approved] },
          },
        },
        orderBy: { assessment: { createdAt: 'asc' } },
        take: 10,
        select: {
          ghg_total_emissions: true,
          ghg_scope_one: true,
          ghg_scope_two: true,
          ghg_scope_three: true,
          startMonth: true,
          startYear: true,
          endMonth: true,
          endYear: true,
        },
      });

      const pad = (n: number | null): string => (n === null ? '--' : n < 10 ? `0${n}` : `${n}`);
      const parseMonth = (m?: string | null): number | null => {
        if (!m) return null;
        const num = parseInt(m, 10);
        if (!isNaN(num)) return num;
        const map: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
        return map[m.toLowerCase().slice(0, 3)] ?? null;
      };

      const emissionTrend = trendReports.map((r) => ({
        period: `${pad(parseMonth(r.startMonth))}/${r.startYear?.slice(-2) ?? '--'} - ${pad(parseMonth(r.endMonth))}/${r.endYear?.slice(-2) ?? '--'}`,
        total: r.ghg_total_emissions,
        scope1: r.ghg_scope_one,
        scope2: r.ghg_scope_two,
        scope3: r.ghg_scope_three,
      }));

      const activities = await this.prisma.activities.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { createdBy: true },
      });

      const recentActivities = activities.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description ?? '',
        type: a.type ?? null,
        status: a.status ?? null,
        date: a.createdAt,
        user: {
          firstName: a.createdBy?.first_name,
          lastName: a.createdBy?.last_name,
          email: a.createdBy?.email,
        },
      }));

      const activeTarget = await this.prisma.target.findFirst({
        where: { companyId },
        orderBy: { updatedAt: 'desc' },
        include: { generalTarget: true, scopeTargets: true },
      });

      const esgPillars = (latestReport?.esgPillars as any) || {};

      return {
        totalEmissions: latestReport?.ghg_total_emissions ?? 0,
        scope1: latestReport?.ghg_scope_one ?? 0,
        scope2: latestReport?.ghg_scope_two ?? 0,
        scope3: latestReport?.ghg_scope_three ?? 0,
        esgScore: latestReport?.esgScore ?? 0,
        esgGrade: latestReport?.esgGrade ?? 'N/A',
        overallProgress: {
          count: `${hubStats.totalCompleted} of ${hubStats.totalSections} sections`,
          percentage: Math.round((hubStats.totalCompleted / hubStats.totalSections) * 100),
        },
        pillars: {
          environmental: esgPillars.environmental?.score ?? esgPillars.environment?.score ?? 0,
          socialCapital: esgPillars.socialCapital?.score ?? esgPillars.social?.score ?? 0,
          humanCapital: esgPillars.humanCapital?.score ?? esgPillars.social?.score ?? 0,
          businessModel: esgPillars.businessModel?.score ?? esgPillars.governance?.score ?? 0,
          leadership: esgPillars.leadership?.score ?? esgPillars.governance?.score ?? 0,
        },
        emissionTrend,
        target: latestReport ? {
          baselineYear: latestReport.startYear ?? '2024',
          baselineEmission: 1500,
          currentYear: latestReport.startYear ?? '2024',
          currentEmission: latestReport.ghg_total_emissions ?? 1500,
          targetYear: '2050',
          targetEmission: 0,
          reductionProgress: 0,
          name: activeTarget?.name ?? '2050 Reduction Target',
        } : null,
        recentActivities,
        latestAssessmentId: latestAssessment?.id ?? null,
        latestAssessmentStatus: latestAssessment?.status ?? null,
        hubStats,
      };
    } catch (err) {
      this.logger.error('Error building company dashboard', err);
      throw new InternalServerErrorException('Failed to build company dashboard');
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
