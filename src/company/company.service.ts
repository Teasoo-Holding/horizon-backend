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
import { ALL_GROUP_KEYS } from './assessments/common/group-keys';
import { ScoringService } from 'src/assessment/scoring/scoring.service';


@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly scoringService: ScoringService,
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

  // Hub prefix → group key mapping for submittedGroups-based progress
  private readonly HUB_PREFIXES = {
    environment: ['environment.'],
    social: ['socialCapital.', 'humanCapital.'],
    governance: ['businessModel.', 'leadershipGovernance.'],
    foundational: ['foundationalData.'],
  };

  async getDashboard(companyId: number) {
    try {
      const latestAssessment = await this.prisma.assessment.findFirst({
        where: { companyId },
        orderBy: { updatedAt: 'desc' },
      });

      // Latest approved/submitted_approved assessment — used for ESG scoring
      const latestApprovedAssessment = await this.prisma.assessment.findFirst({
        where: {
          companyId,
          status: { in: [AssessmentStatus.approved, AssessmentStatus.submitted_approved] },
        },
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

      // Compute ESG scores from the latest approved assessment data
      let esgScore = 0;
      let esgGrade = 'N/A';
      let esgPillars: any = {};

      const approvedData = parseAssessmentData(latestApprovedAssessment?.assessmentData);
      if (approvedData) {
        const totals = {
          ghg_total_emissions: latestReport?.ghg_total_emissions ?? approvedData.totalEmission ?? 0,
        };
        const evaluation = this.scoringService.calculateESGScore(approvedData, totals);
        esgScore = evaluation.overallScore;
        esgGrade = evaluation.overallGrade;
        esgPillars = evaluation.pillars || {};
      } else if (latestReport) {
        // Fallback to stored report scores
        esgScore = latestReport.esgScore ?? 0;
        esgGrade = (latestReport as any).esgGrade ?? 'N/A';
        esgPillars = (latestReport.esgPillars as any) || {};
      }

      return {
        totalEmissions: latestReport?.ghg_total_emissions ?? 0,
        scope1: latestReport?.ghg_scope_one ?? 0,
        scope2: latestReport?.ghg_scope_two ?? 0,
        scope3: latestReport?.ghg_scope_three ?? 0,
        esgScore,
        esgGrade,
        overallProgress: {
          count: `${hubStats?.totalCompleted ?? 0} of ${hubStats?.totalSections ?? 0} sections`,
          percentage: hubStats ? Math.round((hubStats.totalCompleted / (hubStats.totalSections || 1)) * 100) : 0,
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
