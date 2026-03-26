import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCompanyDto } from './dtos/update-company.dto';
import { AssessmentStatus, CompanyStatus } from '@prisma/client';
import { EmailService } from 'src/email/email.service';
import { ALL_GROUP_KEYS } from './assessments/common/group-keys';

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


      const extractTotals = (assessment: any) => {
        const data = parseAssessmentData(assessment?.assessmentData);
        if (!data) return null;
        return {
          total: Math.round(data.overallProgress ?? 0),
          environment: Math.round(data.environment?.progress ?? 0),
          social: Math.round(data.socialCapital?.progress ?? 0),
          governance: Math.round(data.leadershipGovernance?.progress ?? 0),
        };
      };

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        include: { industry: true },
      });

      if (!company) throw new NotFoundException('Company not found');

      const latestTotals = extractTotals(latestAssessment);

      // 4. Hub / Section Progress Stats (based on latest assessment)
      const getHubStats = async (assessment: any, industryId: number | null) => {
        const data = parseAssessmentData(assessment?.assessmentData);
        if (!data || !industryId) return null;

        const submittedGroups: string[] = data?.submittedGroups || [];

        // Fetch the industry's pillars and topics for dynamic stats
        const industryHierarchy = await this.prisma.industry.findUnique({
          where: { id: industryId },
          include: {
            pillars: {
              include: {
                pillar: {
                  include: {
                    topics: {
                      include: {
                        subtopics: {
                          include: {
                            metrics: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!industryHierarchy) return null;

        const getPillarStats = (pillarName: string, sectionGroups: string[][]) => {
          const completedSections = sectionGroups.filter(groups => groups.some(g => submittedGroups.includes(g))).length;
          const progress = sectionGroups.length > 0 ? Math.round((completedSections / sectionGroups.length) * 100) : 0;
          const allGroups = sectionGroups.flat();
          const submittedCount = allGroups.filter(g => submittedGroups.includes(g)).length;

          let status = 'not-started';
          if (submittedCount === allGroups.length && allGroups.length > 0) status = 'completed';
          else if (submittedCount > 0 || progress > 0) status = 'in-progress';

          return {
            progress,
            completed: `${completedSections} of ${sectionGroups.length} sections completed`,
            status,
            completedCount: completedSections,
            totalCount: sectionGroups.length,
          };
        };

        const getGroupsForPillar = (pillarName: string) => {
          const pillar = industryHierarchy.pillars.find((p) =>
            p.pillar.name.toLowerCase().includes(pillarName.toLowerCase()),
          )?.pillar;

          if (!pillar) return [];

          // Map the pillar name to the prefix used in ALL_GROUP_KEYS
          const prefixMap: Record<string, string> = {
            environment: 'environment.',
            social: 'socialCapital.',
            governance: 'leadershipGovernance.',
          };

          const prefix = prefixMap[pillarName.toLowerCase()];
          if (!prefix) return [];

          return ALL_GROUP_KEYS.filter((k) => k.startsWith(prefix)).map((k) => [
            k,
          ]);
        };

        const envSectionGroups = getGroupsForPillar('environment');
        const socialSectionGroups = getGroupsForPillar('social');
        const govSectionGroups = getGroupsForPillar('governance');

        const envStats = getPillarStats('environment', envSectionGroups);
        const socialStats = getPillarStats('social', socialSectionGroups);
        const govStats = getPillarStats('governance', govSectionGroups);

        return {
          environment: envStats,
          social: socialStats,
          governance: govStats,
          totalCompleted: (envStats.completedCount ?? 0) + (socialStats.completedCount ?? 0) + (govStats.completedCount ?? 0),
          totalSections: (envStats.totalCount ?? 0) + (socialStats.totalCount ?? 0) + (govStats.totalCount ?? 0),
        };
      };

      const hubStats = await getHubStats(latestAssessment, company.industryId);

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
