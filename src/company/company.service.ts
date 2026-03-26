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

  // --- Dashboard Section Definitions ---
  private readonly ENV_SECTIONS = [
    ['environment.ghg.scope1.stationarySources', 'environment.ghg.scope1.mobileSources', 'environment.ghg.scope1.processEmissions', 'environment.ghg.scope1.fugitiveEmissions'],
    ['environment.ghg.scope2.locationBased', 'environment.ghg.scope2.marketBased'],
    ['environment.ghg.scope3.upstream', 'environment.ghg.scope3.downstream'],
    ['environment.airQuality.airPollutantEmissions'],
    ['environment.waterManagement.waterAndProducedWaterManagement.freshwaterWithdrawals'],
    ['environment.waterManagement.waterAndProducedWaterManagement.producedWaterManagement'],
    ['environment.waterManagement.hydraulicFracturingImpacts.chemicalDisclosure'],
    ['environment.biodiversityImpact.environmentalManagement.environmentalManagementPolicies'],
  ];

  private readonly SOCIAL_SECTIONS = [
    ['socialCapital.securityHumanRights.operationsInConflictZones', 'socialCapital.securityHumanRights.reservesInNearIndigenousLand', 'socialCapital.securityHumanRights.humanRightsEngagementProcesses'],
    ['socialCapital.communityRelations.communityRiskOpportunityManagement', 'socialCapital.communityRelations.hcdtContribution', 'socialCapital.communityRelations.communityDisputeResolution', 'socialCapital.communityRelations.operationalDelays'],
  ];

  private readonly GOV_SECTIONS = [
    ['businessModel.reservesValuation.reservesSensitivity', 'businessModel.reservesValuation.embeddedCarbon', 'businessModel.reservesValuation.renewableEnergyInvestment', 'businessModel.reservesValuation.capitalExpenditureStrategy'],
    ['businessModel.businessEthics.reservesCountriesCorruptionRisk', 'businessModel.businessEthics.antiCorruptionManagement'],
    ['leadershipGovernance.criticalIncidentRiskManagement.processSafetyEvents', 'leadershipGovernance.criticalIncidentRiskManagement.catastrophicRiskManagementSystems'],
    ['leadershipGovernance.legalRegulatoryEnvironment.boardManagementOversight', 'leadershipGovernance.legalRegulatoryEnvironment.publicPolicyEngagement'],
  ];

  async getDashboard(companyId: number) {
    try {
      // 1. Get the latest assessment for progress/hubStats (can be in-progress)
      const latestAssessment = await this.prisma.assessment.findFirst({
        where: { companyId },
        orderBy: { updatedAt: 'desc' },
      });

      // 2. Get the latest approved/submitted report for the main scores and emissions
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

      // 3. Helper to parse assessment data
      const parseAssessmentData = (raw: any) => {
        if (!raw) return null;
        try {
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          return null;
        }
      };

      // 4. Hub / Section Progress Stats
      const getHubStats = (assessment: any) => {
        const data = parseAssessmentData(assessment?.assessmentData);
        const submittedGroups: string[] = data?.submittedGroups || [];

        const countSubmitted = (sectionGroups: string[][]): number =>
          sectionGroups.filter(groups => groups.some(g => submittedGroups.includes(g))).length;

        const envCompleted = countSubmitted(this.ENV_SECTIONS);
        const socialCompleted = countSubmitted(this.SOCIAL_SECTIONS);
        const govCompleted = countSubmitted(this.GOV_SECTIONS);

        const envProgress = Math.round((envCompleted / this.ENV_SECTIONS.length) * 100);
        const socialProgress = Math.round((socialCompleted / this.SOCIAL_SECTIONS.length) * 100);
        const govProgress = Math.round((govCompleted / this.GOV_SECTIONS.length) * 100);

        const getPillarStatus = (progress: number): string => {
          if (progress === 100) return 'completed';
          if (progress > 0) return 'in-progress';
          return 'not-started';
        };

        return {
          environment: {
            progress: envProgress,
            completed: `${envCompleted} of ${this.ENV_SECTIONS.length} sections completed`,
            status: getPillarStatus(envProgress),
          },
          social: {
            progress: socialProgress,
            completed: `${socialCompleted} of ${this.SOCIAL_SECTIONS.length} sections completed`,
            status: getPillarStatus(socialProgress),
          },
          governance: {
            progress: govProgress,
            completed: `${govCompleted} of ${this.GOV_SECTIONS.length} sections completed`,
            status: getPillarStatus(govProgress),
          },
          totalCompleted: envCompleted + socialCompleted + govCompleted,
          totalSections: this.ENV_SECTIONS.length + this.SOCIAL_SECTIONS.length + this.GOV_SECTIONS.length,
        };
      };

      const hubStats = getHubStats(latestAssessment);

      // 5. Emissions Trend (Last 10 assessments with Reports)
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

      // 6. Recent Activities
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

      // 7. Company Target
      const activeTarget = await this.prisma.target.findFirst({
        where: { companyId },
        orderBy: { updatedAt: 'desc' },
        include: { generalTarget: true, scopeTargets: true },
      });

      // 8. Final Score Pillars (from the latest report)
      const parsePillars = (p: any): any => {
        if (!p) return { E: 0, S: 0, H: 0, B: 0, L: 0 };
        return typeof p === 'string' ? JSON.parse(p) : p;
      };
      const pillarScores = parsePillars(latestReport?.esgPillars);

      return {
        // Main Header Stats
        totalEmissions: latestReport?.ghg_total_emissions ?? 0,
        scope1: latestReport?.ghg_scope_one ?? 0,
        scope2: latestReport?.ghg_scope_two ?? 0,
        scope3: latestReport?.ghg_scope_three ?? 0,

        // ESG Overview
        esgScore: latestReport?.esgScore ?? 0,
        esgGrade: latestReport?.esgGrade ?? 'N/A',
        overallProgress: {
          count: `${hubStats?.totalCompleted ?? 0} of ${hubStats?.totalSections ?? 0} sections`,
          percentage: Math.round(((hubStats?.totalCompleted ?? 0) / (hubStats?.totalSections ?? 1)) * 100),
        },

        // Pillar Breakdown
        pillars: {
          environmental: pillarScores.E ?? 0,
          social: pillarScores.S ?? 0,
          humanCapital: pillarScores.H ?? 0,
          businessModel: pillarScores.B ?? 0,
          leadership: pillarScores.L ?? 0,
        },

        // Emission Trend
        emissionTrend,

        // Target Details
        target: activeTarget ? {
          name: activeTarget.name,
          reduction: activeTarget.generalTarget?.reductionPercentage ?? activeTarget.scopeTargets[0]?.reductionPercentage ?? 0,
          year: activeTarget.targetYear,
        } : null,

        // Recent Items
        recentActivities,
        latestAssessmentId: latestAssessment?.id ?? null,
        latestAssessmentStatus: latestAssessment?.status ?? null,

        // Detailed hub stats for pillar cards if needed
        hubStats,
      };
    } catch (err) {
      console.error('Error building company dashboard', err);
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
