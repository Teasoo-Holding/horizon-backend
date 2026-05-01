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
        industry: { include: { sector: true } },
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
        industry: { include: { sector: true } },
      },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }
  async updateStatus(id: number, status: CompanyStatus) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        industry: { include: { sector: true } },
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
        industry: { include: { sector: true } },
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
      // All three queries are independent — fetch in parallel.
      // Note: total emissions, emission trend, and target progress are NOT
      // included here. The frontend already consumes them via /report/:id
      // and /target/with-progress respectively. Including them here was
      // dead weight (and the previous target block returned hardcoded
      // 1500/2050 placeholder values regardless of the active target).
      const [latestAssessment, latestApprovedAssessment, activities] = await Promise.all([
        // For hub progress: only need id, status, and submittedGroups inside
        // assessmentData. Prisma can't slice JSON columns, so the full JSON
        // does come down — keep the row light by skipping relations.
        this.prisma.assessment.findFirst({
          where: { companyId },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, status: true, assessmentData: true },
        }),
        // For ESG scoring: prefer the report's stored values; fall back to
        // recomputing from assessmentData only when missing (rare — should
        // only happen for legacy approvals predating the score-on-approve
        // pipeline).
        this.prisma.assessment.findFirst({
          where: {
            companyId,
            status: { in: [AssessmentStatus.approved, AssessmentStatus.submitted_approved] },
          },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            status: true,
            assessmentData: true,
            report: {
              select: {
                ghg_total_emissions: true,
                esgScore: true,
                esgGrade: true,
                esgPillars: true,
              },
            },
          },
        }),
        this.prisma.activities.findMany({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { createdBy: true },
        }),
      ]);

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
        const submitted: string[] = Array.isArray(data?.submittedGroups) ? data.submittedGroups : [];

        const countByHub = (prefixes: string[]) => {
          const total = ALL_GROUP_KEYS.filter(k => prefixes.some(p => k.startsWith(p))).length;
          const completed = submitted.filter(k => prefixes.some(p => k.startsWith(p))).length;
          return { completed, total };
        };

        const env = countByHub([...this.HUB_PREFIXES.environment, ...this.HUB_PREFIXES.foundational]);
        const soc = countByHub(this.HUB_PREFIXES.social);
        const gov = countByHub(this.HUB_PREFIXES.governance);

        const totalCompleted = env.completed + soc.completed + gov.completed;
        const totalSections = env.total + soc.total + gov.total;

        const getStatus = (completed: number, total: number): string => {
          if (total > 0 && completed >= total) return 'completed';
          if (completed > 0) return 'in-progress';
          return 'not-started';
        };

        return {
          environment: {
            progress: env.total > 0 ? Math.round((env.completed / env.total) * 100) : 0,
            completed: `${env.completed} of ${env.total} sections completed`,
            status: getStatus(env.completed, env.total),
          },
          social: {
            progress: soc.total > 0 ? Math.round((soc.completed / soc.total) * 100) : 0,
            completed: `${soc.completed} of ${soc.total} sections completed`,
            status: getStatus(soc.completed, soc.total),
          },
          governance: {
            progress: gov.total > 0 ? Math.round((gov.completed / gov.total) * 100) : 0,
            completed: `${gov.completed} of ${gov.total} sections completed`,
            status: getStatus(gov.completed, gov.total),
          },
          totalCompleted,
          totalSections,
        };
      };

      const hubStats = getHubStats(latestAssessment);

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

      // ESG scores: prefer stored values on the Report row (cheap, already
      // computed on approval). Recompute from assessmentData only when the
      // stored values are missing.
      let esgScore = 0;
      let esgGrade = 'N/A';
      let esgPillars: any = {};

      const storedReport = latestApprovedAssessment?.report;
      const hasStoredScore =
        storedReport && (storedReport.esgScore != null || storedReport.esgGrade != null);

      if (hasStoredScore) {
        esgScore = storedReport.esgScore ?? 0;
        esgGrade = storedReport.esgGrade ?? 'N/A';
        esgPillars = (storedReport.esgPillars as any) || {};
      } else {
        const approvedData = parseAssessmentData(latestApprovedAssessment?.assessmentData);
        if (approvedData) {
          const totals = {
            ghg_total_emissions:
              storedReport?.ghg_total_emissions ?? approvedData.totalEmission ?? 0,
          };
          const evaluation = this.scoringService.calculateESGScore(approvedData, totals);
          esgScore = evaluation.overallScore;
          esgGrade = evaluation.overallGrade;
          esgPillars = evaluation.pillars || {};
        }
      }

      // Pillars: each one falls back to 0/N/A on its own. The previous
      // cross-pillar fallbacks (humanCapital → social, businessModel →
      // governance, leadership → governance) were legacy from the old
      // 3-pillar model and silently mis-attributed scores.
      return {
        esgScore,
        esgGrade,
        overallProgress: {
          count: `${hubStats.totalCompleted} of ${hubStats.totalSections} sections`,
          percentage: hubStats.totalSections > 0 ? Math.round((hubStats.totalCompleted / hubStats.totalSections) * 100) : 0,
        },
        pillars: {
          environmental: {
            score: esgPillars.environmental?.score ?? esgPillars.environment?.score ?? 0,
            grade: esgPillars.environmental?.grade ?? esgPillars.environment?.grade ?? 'N/A',
            indicators: esgPillars.environmental?.indicators ?? esgPillars.environment?.indicators ?? [],
          },
          socialCapital: {
            score: esgPillars.socialCapital?.score ?? 0,
            grade: esgPillars.socialCapital?.grade ?? 'N/A',
            indicators: esgPillars.socialCapital?.indicators ?? [],
          },
          humanCapital: {
            score: esgPillars.humanCapital?.score ?? 0,
            grade: esgPillars.humanCapital?.grade ?? 'N/A',
            indicators: esgPillars.humanCapital?.indicators ?? [],
          },
          businessModel: {
            score: esgPillars.businessModel?.score ?? 0,
            grade: esgPillars.businessModel?.grade ?? 'N/A',
            indicators: esgPillars.businessModel?.indicators ?? [],
          },
          leadership: {
            score: esgPillars.leadership?.score ?? 0,
            grade: esgPillars.leadership?.grade ?? 'N/A',
            indicators: esgPillars.leadership?.indicators ?? [],
          },
        },
        recentActivities,
        // Latest *approved* assessment so the frontend's /report/:id call
        // resolves to a record that actually has report data. Falls back to
        // the latest-of-any-status when no approved exists yet, so newly
        // signed-up companies still get a meaningful id.
        latestAssessmentId: latestApprovedAssessment?.id ?? latestAssessment?.id ?? null,
        latestAssessmentStatus: latestApprovedAssessment?.status ?? latestAssessment?.status ?? null,
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
