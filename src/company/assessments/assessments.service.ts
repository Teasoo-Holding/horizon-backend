import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Assessment, AssessmentStatus, TaskStatus } from '@prisma/client';
import { VALIDATOR_ROLES } from 'src/auth/roles/role.constants';
import { ReportService } from '../report/report.service';
import { ActivitiesService } from 'src/activities/activities.service';
import { EmailService } from 'src/email/email.service';
import { AssessmentCalculatorService } from './assessment-calculator.service';

const PILLAR_GROUPS = {
  environment: [
    'environment.ghg.scope1.stationarySources',
    'environment.ghg.scope1.mobileSources',
    'environment.ghg.scope1.processEmissions',
    'environment.ghg.scope1.fugitiveEmissions',
    'environment.ghg.scope2.locationBased',
    'environment.ghg.scope2.marketBased',
    'environment.ghg.scope3.upstream',
    'environment.ghg.scope3.downstream',
    'environment.airQuality.airPollutantEmissions',
    'environment.waterManagement.waterAndProducedWaterManagement.freshwaterWithdrawals',
    'environment.waterManagement.waterAndProducedWaterManagement.producedWaterManagement',
    'environment.biodiversityImpact.environmentalManagement.hydrocarbonSpills',
    'environment.biodiversityImpact.environmentalManagement.environmentalManagementPolicies',
    'environment.biodiversityImpact.environmentalManagement.reservesInSensitiveAreas',
  ],
  foundationalData: [
    'foundationalData.activityMetrics.productionVolumes',
    'foundationalData.activityMetrics.offshoreSites',
    'foundationalData.activityMetrics.terrestrialSites',
  ],
  socialCapital: [
    'socialCapital.securityHumanRights.operationsInConflictZones',
    'socialCapital.securityHumanRights.reservesInNearIndigenousLand',
    'socialCapital.securityHumanRights.humanRightsEngagementProcesses',
    'socialCapital.communityRelations.communityRiskOpportunityManagement',
    'socialCapital.communityRelations.hcdtContribution',
    'socialCapital.communityRelations.communityDisputeResolution',
    'socialCapital.communityRelations.operationalDelays',
  ],
  humanCapital: [
    'humanCapital.workforceHealthSafety',
    'humanCapital.riskAndOpportunityManagement.healthAndSafetyPerformance',
  ],
  businessModel: [
    'businessModel.reservesValuation.reservesSensitivity',
    'businessModel.reservesValuation.embeddedCarbon',
    'businessModel.reservesValuation.renewableEnergyInvestment',
    'businessModel.reservesValuation.capitalExpenditureStrategy',
    'businessModel.businessEthics.reservesCountriesCorruptionRisk',
    'businessModel.businessEthics.antiCorruptionManagement',
  ],
  leadershipGovernance: [
    'leadershipGovernance.criticalIncidentRiskManagement.processSafetyEvents',
    'leadershipGovernance.criticalIncidentRiskManagement.catastrophicRiskManagementSystems',
    'leadershipGovernance.legalRegulatoryEnvironment.boardManagementOversight',
    'leadershipGovernance.legalRegulatoryEnvironment.publicPolicyEngagement',
  ],
};

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(
    private prisma: PrismaService,
    private calculator: AssessmentCalculatorService,
    private activitiesService: ActivitiesService,
    private reportService: ReportService,
    private emailService: EmailService,
  ) { }

  async createAssessment(
    companyId: number,
    userId: number,
    dto: {
      subsidiary: string;
      startMonth: string;
      startYear: string;
      endMonth: string;
      endYear: string;
    },
  ): Promise<Assessment> {
    try {
      // Deduplication: return existing in-progress assessment for same company + period
      const existing = await this.prisma.assessment.findFirst({
        where: {
          companyId,
          status: AssessmentStatus.in_progress,
          subsidiary: dto.subsidiary || 'Self',
          startMonth: dto.startMonth,
          startYear: dto.startYear,
          endMonth: dto.endMonth,
          endYear: dto.endYear,
        },
      });

      if (existing) {
        return existing;
      }

      const assessment = await this.prisma.assessment.create({
        data: {
          companyId,
          created_by: userId,
          updated_by: userId,
          status: AssessmentStatus.in_progress,
          subsidiary: dto.subsidiary || 'Self',
          startMonth: dto.startMonth,
          startYear: dto.startYear,
          endMonth: dto.endMonth,
          endYear: dto.endYear,
          assessmentData: { lastSavedForm: null },
        },
      });

      // Create a corresponding Task so this assessment appears in the Tasks dashboard
      const dueDate = new Date(
        `${dto.endYear}-${this.monthToNumber(dto.endMonth)}-28`,
      );
      await this.prisma.task.create({
        data: {
          taskName: `ESG Assessment – ${dto.subsidiary || 'Self'}`,
          dueDate,
          status: TaskStatus.in_progress,
          createdById: userId,
          assignments: {
            create: [
              {
                userId,
                topics: [],
                assessmentId: assessment.id,
                startedAt: new Date(),
              },
            ],
          },
        },
      });

      await this.activitiesService.logActivity({
        companyId,
        createdById: userId,
        title: 'New assessment draft created',
        description: `User created assessment #${assessment.id}`,
        type: 'assessment',
        status: 'created',
      });

      return assessment;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Assessment for this period already exists. Continue the existing one or delete it first.',
        );
      }
      throw error;
    }
  }

  async saveProgress(
    companyId: number,
    userId: number,
    assessmentId: number,
    payload: {
      path: string;
      data: any;
      lastSavedForm?: string;
    },
  ): Promise<Assessment> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId, companyId },
    });

    if (!assessment) throw new NotFoundException('Assessment not found');

    // Only in_progress, awaiting_review, and declined assessments are editable
    const lockedStatuses: AssessmentStatus[] = [
      AssessmentStatus.submitted_approved,
      AssessmentStatus.approved,
    ];
    if (lockedStatuses.includes(assessment.status)) {
      throw new BadRequestException(
        `Cannot edit an assessment with status "${assessment.status}". Only in-progress, awaiting-review, or declined assessments can be edited.`,
      );
    }

    // If editing a declined assessment, reset to in_progress
    if (assessment.status === AssessmentStatus.declined) {
      await this.prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: AssessmentStatus.in_progress, rejection_reason: null, submittedAt: null },
      });
    }

    const currentData = (assessment.assessmentData || {}) as any;

    const merged = this.deepMerge(currentData, payload.path, payload.data);

    if (payload.lastSavedForm) {
      merged.lastSavedForm = payload.lastSavedForm;
    }

    let recalculated: any;
    try {
      const result = await this.calculator.recalculate(merged);
      recalculated = result.data;
    } catch (error) {
      this.logger.error(`Recalculation failed for assessment ${assessmentId}`, error instanceof Error ? error.stack : error);
      throw new InternalServerErrorException('Failed to recalculate assessment data. Please try again.');
    }

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        assessmentData: recalculated as any,
        updated_by: userId,
      },
      select: { id: true, status: true, updatedAt: true },
    });

    await this.activitiesService.logActivity({
      companyId,
      createdById: userId,
      title: 'Assessment progress saved',
      description: `Saved form: ${payload.lastSavedForm || 'unknown'}`,
      type: 'assessment',
      status: 'updated',
    });

    return updated as Assessment;
  }

  async submitGroup(
    companyId: number,
    userId: number,
    assessmentId: number,
    lastSavedForm?: string,
  ): Promise<{
    assessment: Assessment;
    scopeTotals: any;
    progress: any;
    totals: any;
  }> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId, companyId },
      include: { company: true },
    });

    if (!assessment) throw new NotFoundException('Assessment not found');

    const currentData = (assessment.assessmentData || {}) as any;
    if (lastSavedForm) {
      currentData.lastSavedForm = lastSavedForm;
      const groupPath = this.getGroupPath(lastSavedForm);
      if (groupPath) {
        currentData.submittedGroups = Array.from(
          new Set([...(currentData.submittedGroups || []), groupPath]),
        );
      }
      // Keep lastSavedForm so "Continue" resumes at the right place
    }

    let result: Awaited<ReturnType<AssessmentCalculatorService['recalculate']>>;
    try {
      result = await this.calculator.recalculate(currentData);
    } catch (error) {
      this.logger.error(`Recalculation failed for assessment ${assessmentId}`, error instanceof Error ? error.stack : error);
      throw new InternalServerErrorException('Failed to recalculate assessment data. Please try again.');
    }

    const recalculated = result.data as any;
    const scopeTotals = result.scopeTotals;

    // Preserve current status — submitGroup no longer transitions status.
    // Final submission is now an explicit user action via submitForReview().
    const currentStatus = assessment.status;

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        assessmentData: recalculated as any,
        status: currentStatus,
        updated_by: userId,
      },
    });

    await this.activitiesService.logActivity({
      companyId,
      createdById: userId,
      title: 'Assessment group submitted',
      description: `Group submitted: ${lastSavedForm}`,
      type: 'assessment',
      status: 'submitted',
    });

    try {
      await this.reportService.saveReportingData(assessmentId);
    } catch (error) {
      this.logger.error(`Report generation failed for assessment ${assessmentId}`, error instanceof Error ? error.stack : error);
    }

    return {
      assessment: updated,
      scopeTotals,
      progress: recalculated.overallProgress
        ? [{ progress: recalculated.overallProgress }]
        : [],
      totals: {
        totals: {
          sum: this.getGroupSum(result.breakdown, lastSavedForm, recalculated),
          breakdown: result.breakdown,
        },
      },
    };
  }

  private getGroupSum(breakdown: any, lastSavedForm?: string, recalculated?: any): number {
    if (!lastSavedForm) return 0;

    if (lastSavedForm.includes("stationary")) return breakdown.stationarySources?.sum || 0;
    if (lastSavedForm.includes("mobile")) return breakdown.mobileSources?.sum || 0;
    if (lastSavedForm.includes("process")) return breakdown.processEmissions?.sum || 0;
    if (lastSavedForm.includes("fugitive")) return breakdown.fugitiveEmissions?.sum || 0;
    if (lastSavedForm.includes("location")) return breakdown.scope2Location?.sum || 0;
    if (lastSavedForm.includes("market")) return breakdown.scope2Market?.sum || 0;
    if (lastSavedForm.includes("upstream")) return breakdown.upstreamEmissions?.sum || 0;
    if (lastSavedForm.includes("downstream")) return breakdown.downstreamEmissions?.sum || 0;

    // Non-GHG assessments: extract totals from recalculated data
    if (lastSavedForm.includes("airQuality") || lastSavedForm.includes("airPollutant") || lastSavedForm.includes("air-pollutant")) {
      return recalculated?.environment?.airQuality?.airPollutantEmissions?.calculated?.total || 0;
    }

    return 0;
  }

  async submitForReview(
    companyId: number,
    userId: number,
    assessmentId: number,
    reviewerId?: number,
    userRole?: string,
  ): Promise<Assessment> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId, companyId },
      include: { company: true },
    });

    if (!assessment) throw new NotFoundException('Assessment not found');

    // Only in_progress or declined assessments can be submitted
    if (
      assessment.status !== AssessmentStatus.in_progress &&
      assessment.status !== AssessmentStatus.declined
    ) {
      throw new BadRequestException(
        `Cannot submit: assessment is currently "${assessment.status}".`,
      );
    }

    const requireReview =
      assessment.company?.requireAssessmentReview ?? true;

    let newStatus: AssessmentStatus;
    let finalReviewerId: number | null = null;

    const isSubmitterValidator = userRole
      && (VALIDATOR_ROLES as readonly string[]).includes(userRole);

    if (requireReview) {
      newStatus = AssessmentStatus.awaiting_review;

      if (reviewerId) {
        // Validate that the selected reviewer has approval permissions
        const reviewer = await this.prisma.user.findUnique({
          where: { id: reviewerId },
          include: { role: true },
        });
        if (!reviewer || !(VALIDATOR_ROLES as readonly string[]).includes(reviewer.role?.name)) {
          throw new BadRequestException(
            'Selected reviewer does not have approval permissions. Please select an administrator.',
          );
        }
        finalReviewerId = reviewerId;
      } else if (isSubmitterValidator) {
        // Admin/SubAdmin submitting without selecting a reviewer = self-review OK
        finalReviewerId = userId;
      } else {
        // Data Officer submitting without selecting a reviewer = not allowed
        throw new BadRequestException(
          'Please select a reviewer. Contributors cannot self-review assessments.',
        );
      }
    } else {
      // Auto-approval (company's requireAssessmentReview = false): the submitter
      // is implicitly the approver. Recording them as reviewer keeps the audit
      // trail populated — previously reviewed_by was left null and approvals
      // looked like they had no responsible party.
      newStatus = AssessmentStatus.submitted_approved;
      finalReviewerId = userId;
    }

    const now = new Date();
    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: newStatus,
        updated_by: userId,
        reviewed_by: finalReviewerId,
        rejection_reason: null, // clear any previous decline reason
        submittedAt: now,
        ...(newStatus === AssessmentStatus.submitted_approved
          ? { approvedAt: now }
          : {}),
      },
    });

    await this.activitiesService.logActivity({
      companyId,
      createdById: userId,
      title: requireReview
        ? 'Assessment submitted for review'
        : 'Assessment submitted (auto-approved)',
      description: `Assessment #${assessmentId} status changed to ${newStatus}`,
      type: 'assessment',
      status: 'submitted',
    });

    try {
      await this.reportService.saveReportingData(assessmentId);
    } catch (error) {
      this.logger.error(`Report generation failed after submit for assessment ${assessmentId}`, error instanceof Error ? error.stack : error);
    }

    return updated;
  }

  async getAssessments(companyId: number) {
    const rows = await this.prisma.assessment.findMany({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
      include: { company: { select: { requireAssessmentReview: true } } },
    });

    return rows.map(({ assessmentData, ...rest }) => {
      const summary = this.summarizeAssessment(assessmentData);
      return { ...rest, ...summary };
    });
  }

  /**
   * Compute a slim summary (pillars, progress, submittedGroupsCount) from
   * the heavy assessmentData JSONB. Lets the list endpoint omit the full blob
   * while preserving everything the dashboard table renders.
   */
  private summarizeAssessment(assessmentData: any) {
    const data = (assessmentData || {}) as any;
    const submittedGroups: string[] = Array.isArray(data.submittedGroups) ? data.submittedGroups : [];
    const overallProgress = typeof data.overallProgress === 'number' ? data.overallProgress : 0;

    const TOTAL = Object.values(PILLAR_GROUPS).reduce((sum, arr) => sum + arr.length, 0);
    const progress = submittedGroups.length >= TOTAL
      ? 100
      : Math.min(parseFloat(overallProgress.toFixed(2)), 100);

    const env = data.environment ?? data.environmental;
    const social = data.socialCapital ?? data.social;
    const human = data.humanCapital;
    const business = data.businessInnovation ?? data.businessModel;
    const leadership = data.leadershipGovernance;
    const activity = data.foundationalData?.activityMetrics ?? data.activityMetrics;

    const pillars: ('A' | 'E' | 'S' | 'H' | 'B' | 'L' | 'G')[] = [];
    if (this.hasUserData(activity)) pillars.push('A');
    if (this.hasEnvData(env)) pillars.push('E');
    if (this.hasUserData(social)) pillars.push('S');
    if (this.hasUserData(human)) pillars.push('H');
    if (this.hasUserData(business)) pillars.push('B');
    if (this.hasUserData(leadership?.criticalIncidentRiskManagement)) pillars.push('L');
    if (this.hasUserData(leadership?.managementOfTheLegalAndRegulatoryEnvironment)) pillars.push('G');

    return { pillars, progress, submittedGroupsCount: submittedGroups.length };
  }

  private static readonly COMPUTED_KEYS = new Set([
    'progress', 'totalEmission', 'totalEmissions', 'calculated', 'dataCount',
    'breakdown', 'status', 'lastUpdated', 'id', 'createdAt', 'updatedAt', '_id',
  ]);

  private hasUserData(obj: any): boolean {
    return !!obj && typeof obj === 'object' &&
      Object.keys(obj).some((k) => !AssessmentService.COMPUTED_KEYS.has(k));
  }

  private hasEnvData(env: any): boolean {
    if (!env) return false;
    if (this.hasUserData(env.airQuality)) return true;
    if (this.hasUserData(env.waterManagement)) return true;
    if (this.hasUserData(env.biodiversityImpact)) return true;
    const ghg = env.ghg;
    if (!ghg) return false;
    const hasScope = (scope: any, groups: string[]) =>
      scope && groups.some((g) => this.hasUserData(scope[g]));
    return (
      hasScope(ghg.scope1, ['stationarySources', 'mobileSources', 'processEmissions', 'fugitiveEmissions']) ||
      hasScope(ghg.scope2, ['locationBased', 'marketBased']) ||
      hasScope(ghg.scope3, ['upstream', 'downstream'])
    );
  }

  async getAssessment(
    companyId: number,
    assessmentId: number,
  ): Promise<Assessment> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId, companyId },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }
    return assessment;
  }

  async deleteAssessment(
    companyId: number,
    assessmentId: number,
  ): Promise<void> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId, companyId },
      select: { status: true, created_by: true },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (assessment.status !== AssessmentStatus.in_progress) {
      throw new BadRequestException(
        'Only draft (in-progress) assessments can be deleted.',
      );
    }

    // Wrap the entire delete chain in a transaction so partial deletes cannot occur
    await this.prisma.$transaction(async (tx) => {
      // Clean up any Task+TaskAssignment linked to this assessment
      const linkedAssignments = await tx.taskAssignment.findMany({
        where: { assessmentId },
        select: { id: true, taskId: true },
      });
      if (linkedAssignments.length > 0) {
        const taskIds = [...new Set(linkedAssignments.map((a) => a.taskId))];
        await tx.taskAssignment.deleteMany({
          where: { assessmentId },
        });
        // Delete parent tasks that now have no remaining assignments
        const tasksWithOtherAssignments = await tx.taskAssignment.groupBy({
          by: ['taskId'],
          where: { taskId: { in: taskIds } },
        });
        const tasksStillInUse = new Set(
          tasksWithOtherAssignments.map((t) => t.taskId),
        );
        const orphanedTaskIds = taskIds.filter((id) => !tasksStillInUse.has(id));

        if (orphanedTaskIds.length > 0) {
          await tx.taskComment.deleteMany({
            where: { taskId: { in: orphanedTaskIds } },
          });
          await tx.task.deleteMany({
            where: { id: { in: orphanedTaskIds } },
          });
        }
      }

      await tx.report.deleteMany({
        where: { assessmentId },
      });

      await tx.assessment.delete({
        where: { id: assessmentId },
      });
    });

    await this.activitiesService.logActivity({
      companyId,
      createdById: assessment.created_by!,
      title: `Deleted draft assessment`,
      description: `Draft assessment ${assessmentId} deleted.`,
      type: 'assessment',
      status: 'deleted',
    });
  }

  async approveAssessment(
    companyId: number,
    currentUserId: number,
    assessmentId: number,
  ): Promise<{ assessment: Assessment; emailSent: boolean; reportGenerated: boolean }> {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, companyId },
      select: {
        status: true,
        creator: { select: { email: true, first_name: true } },
        company: { select: { name: true } },
      },
    });

    if (!assessment) throw new NotFoundException('Assessment not found');

    // Only assessments currently awaiting a reviewer decision can be approved.
    // submitted_approved is a terminal auto-approved state and re-approving would
    // overwrite reviewer metadata and re-run side effects.
    if (assessment.status !== AssessmentStatus.awaiting_review) {
      throw new BadRequestException(
        `Cannot approve an assessment with status "${assessment.status}". Only assessments awaiting review can be approved.`,
      );
    }

    const now = new Date();

    // Status change + audit log must succeed or fail together — either there's an
    // approved assessment with a matching activity entry, or neither.
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.assessment.update({
        where: { id: assessmentId, companyId },
        data: {
          status: AssessmentStatus.approved,
          updated_by: currentUserId,
          reviewed_by: currentUserId,
          reviewedAt: now,
          approvedAt: now,
          rejection_reason: null,
        },
      });

      await tx.activities.create({
        data: {
          companyId,
          createdById: currentUserId,
          title: 'Assessment approved',
          description: `Assessment #${assessmentId} approved by user #${currentUserId}`,
          type: 'assessment',
          status: 'approved',
        },
      });

      return result;
    });

    // Best-effort side effects. Approval itself has already succeeded; we surface
    // the outcomes so the caller can warn the user if email or report gen failed.
    let emailSent = false;
    const creatorEmail = assessment.creator?.email;
    if (creatorEmail) {
      try {
        const result = await this.emailService.sendEmail(
          creatorEmail,
          {
            first_name: assessment.creator?.first_name || '',
            company_name: assessment.company?.name || '',
          },
          24,
        );
        emailSent = !!(result as any)?.success;
      } catch (error) {
        this.logger.error(
          `Failed to send approval email for assessment ${assessmentId}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }

    let reportGenerated = false;
    try {
      await this.reportService.saveReportingData(assessmentId);
      reportGenerated = true;
    } catch (error) {
      this.logger.error(
        `Report generation failed after approval for assessment ${assessmentId}`,
        error instanceof Error ? error.stack : error,
      );
    }

    return { assessment: updated, emailSent, reportGenerated };
  }

  async declineAssessment(
    companyId: number,
    currentUserId: number,
    assessmentId: number,
    rejectionReason: string,
  ): Promise<{ assessment: Assessment; emailSent: boolean }> {
    const assessmentWithCreator = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, companyId },
      select: {
        status: true,
        company: { select: { name: true } },
        creator: { select: { email: true, first_name: true } },
      },
    });

    if (!assessmentWithCreator) {
      throw new NotFoundException('Assessment not found');
    }

    if (assessmentWithCreator.status !== AssessmentStatus.awaiting_review) {
      throw new BadRequestException(
        `Cannot decline an assessment with status "${assessmentWithCreator.status}". Only assessments awaiting review can be declined.`,
      );
    }

    const creatorEmail = assessmentWithCreator.creator?.email;
    const first_name = assessmentWithCreator.creator?.first_name || '';
    const company_name = assessmentWithCreator.company?.name || '';
    if (!creatorEmail) {
      throw new NotFoundException('Creator email not found for this assessment');
    }

    // Status change + audit log are atomic. Email is best-effort and its outcome
    // is returned so the caller can surface a warning if the submitter won't
    // know they need to revise.
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.assessment.update({
        where: { id: assessmentId, companyId },
        data: {
          status: AssessmentStatus.declined,
          updated_by: currentUserId,
          reviewed_by: currentUserId,
          reviewedAt: new Date(),
          rejection_reason: rejectionReason,
        },
      });

      await tx.activities.create({
        data: {
          companyId,
          createdById: currentUserId,
          title: 'Assessment declined',
          description: `Assessment #${assessmentId} declined: ${rejectionReason}`,
          type: 'assessment',
          status: 'declined',
        },
      });

      return result;
    });

    let emailSent = false;
    try {
      const result = await this.emailService.sendEmail(
        creatorEmail,
        { first_name, company_name, reason: rejectionReason },
        17,
      );
      emailSent = !!(result as any)?.success;
    } catch (error) {
      this.logger.error(
        `Failed to send decline email for assessment ${assessmentId}`,
        error instanceof Error ? error.stack : error,
      );
    }

    return { assessment: updated, emailSent };
  }

  private deepMerge(obj: any, path: string, value: any): any {
    const cloned = structuredClone(obj);
    const parts = path.split('.');
    let current = cloned;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    current[parts[parts.length - 1]] = {
      ...current[parts[parts.length - 1]],
      ...value,
    };

    return cloned;
  }

  private getGroupPath(formKey: string): string | null {
    if (formKey.startsWith('ghg-scope1-stationary')) {
      return 'environment.ghg.scope1.stationarySources';
    }
    if (
      formKey.startsWith('ghg-mobile-sources') ||
      formKey.startsWith('ghg-scope1-mobile')
    ) {
      return 'environment.ghg.scope1.mobileSources';
    }
    if (
      formKey.startsWith('ghg-scope1-process') ||
      formKey.startsWith('ghg-process-emissions')
    ) {
      return 'environment.ghg.scope1.processEmissions';
    }
    if (
      formKey.startsWith('ghg-scope1-fugitive') ||
      formKey.startsWith('ghg-fugitive-emissions')
    ) {
      return 'environment.ghg.scope1.fugitiveEmissions';
    }
    if (formKey.startsWith('ghg-scope2-location')) {
      return 'environment.ghg.scope2.locationBased';
    }
    if (formKey.startsWith('ghg-scope2-market')) {
      return 'environment.ghg.scope2.marketBased';
    }
    if (formKey.startsWith('ghg-scope3-upstream')) {
      return 'environment.ghg.scope3.upstream';
    }
    if (
      formKey.startsWith('ghg-scope3-downstream') ||
      formKey === 'ghg-scope3-document-upload' ||
      formKey === 'ghg-scope3-use-of-sold-products' ||
      formKey === 'ghg-scope3-end-of-life-treatment' ||
      formKey === 'ghg-scope3-investments' ||
      formKey === 'ghg-scope3-franchises'
    ) {
      return 'environment.ghg.scope3.downstream';
    }
    if (formKey === 'air-pollutant-emissions') {
      return 'environment.airQuality.airPollutantEmissions';
    }
    if (formKey === 'freshwater-withdrawal-consumption') {
      return 'environment.waterManagement.waterAndProducedWaterManagement.freshwaterWithdrawals';
    }
    if (formKey === 'produced-water-management') {
      return 'environment.waterManagement.waterAndProducedWaterManagement.producedWaterManagement';
    }
    if (formKey === 'water-quality-impacts') {
      return 'environment.waterManagement.hydraulicFracturingImpacts.waterQualityImpacts';
    }
    if (formKey === 'chemical-disclosure') {
      return 'environment.waterManagement.hydraulicFracturingImpacts.chemicalDisclosure';
    }
    if (formKey === 'hydrocarbon-spills') {
      return 'environment.biodiversityImpact.environmentalManagement.hydrocarbonSpills';
    }
    if (formKey === 'environmental-management-policies') {
      return 'environment.biodiversityImpact.environmentalManagement.environmentalManagementPolicies';
    }
    if (formKey === 'reserves-in-sensitive-areas') {
      return 'environment.biodiversityImpact.environmentalManagement.reservesInSensitiveAreas';
    }

    if (formKey === 'foundational-activity-production' || formKey === 'activityMetrics.productionVolume') {
      return 'foundationalData.activityMetrics.productionVolumes';
    }
    if (formKey === 'foundational-activity-offshore' || formKey === 'activityMetrics.assetPortfolio.offshoreSites') {
      return 'foundationalData.activityMetrics.offshoreSites';
    }
    if (formKey === 'foundational-activity-terrestrial' || formKey === 'activityMetrics.assetPortfolio.terrestrialSites') {
      return 'foundationalData.activityMetrics.terrestrialSites';
    }

    if (formKey.startsWith('env-air-quality')) {
      return 'environment.airQuality';
    }
    if (formKey.startsWith('env-water-management')) {
      return 'environment.waterManagement';
    }
    if (formKey.startsWith('env-biodiversity')) {
      return 'environment.biodiversityImpact';
    }

    // Social Capital
    if (formKey.startsWith('soc-security-conflict') || formKey.includes('securityRights.reservesAreaConflict')) {
      return 'socialCapital.securityHumanRights.operationsInConflictZones';
    }
    if (formKey.startsWith('soc-security-indigenous') || formKey.includes('securityRights.reservesIndigenousLand')) {
      return 'socialCapital.securityHumanRights.reservesInNearIndigenousLand';
    }
    if (formKey.startsWith('soc-security-engagement') || formKey.includes('securityRights.humanRightEngagement')) {
      return 'socialCapital.securityHumanRights.humanRightsEngagementProcesses';
    }
    // Social Capital - Community Relations
    if (formKey.includes('communityRisk') || formKey.startsWith('soc-community-risk')) {
      return 'socialCapital.communityRelations.communityRiskOpportunityManagement';
    }
    if (formKey.includes('hcdtContribution') || formKey.startsWith('soc-community-hcdt')) {
      return 'socialCapital.communityRelations.hcdtContribution';
    }
    if (formKey.includes('disputeResolution') || formKey.startsWith('soc-community-dispute')) {
      return 'socialCapital.communityRelations.communityDisputeResolution';
    }
    if (formKey.includes('operationalDelays') || formKey.startsWith('soc-community-delays')) {
      return 'socialCapital.communityRelations.operationalDelays';
    }

    // Human Capital
    if (formKey.startsWith('humanCapital.workforceHealthAndSafety.riskAndOpportunityManagement.safetyManagementSystems')) {
      return 'humanCapital.workforceHealthSafety';
    }
    if (formKey.startsWith('humanCapital.riskAndOpportunityManagement.healthAndSafetyPerformance')) {
      return 'humanCapital.riskAndOpportunityManagement.healthAndSafetyPerformance';
    }

    // Business Model
    if (formKey.includes('reserveValuation.climateImpact.reserveSensitivity') || formKey.includes('reservesSensitivityToCarbonPricing')) {
      return 'businessModel.reservesValuation.reservesSensitivity';
    }
    if (formKey.includes('reserveValuation.climateImpact.embeddedCarbon') || formKey.includes('embeddedCarbonInReserves')) {
      return 'businessModel.reservesValuation.embeddedCarbon';
    }
    if (
      formKey.includes('strategicCapitalAllocation.renewableEnergyInvestment') ||
      formKey === 'businessInnovation.reservesValuationAndCapitalExpenditures.renewableEnergyInvestment'
    ) {
      return 'businessModel.reservesValuation.renewableEnergyInvestment';
    }
    if (
      formKey.includes('strategicCapitalAllocation.capitalExpenditureStrategy') ||
      formKey === 'businessInnovation.reservesValuationAndCapitalExpenditures.capitalExpenditureStrategy'
    ) {
      return 'businessModel.reservesValuation.capitalExpenditureStrategy';
    }
    if (formKey.includes('businessEthicsAndTransparency.reservesCountriesCorruptionRisk') || formKey.includes('reservesInCountriesWithHighCorruptionRisk')) {
      return 'businessModel.businessEthics.reservesCountriesCorruptionRisk';
    }
    if (formKey.includes('businessEthicsAndTransparency.antiCorruptionManagement')) {
      return 'businessModel.businessEthics.antiCorruptionManagement';
    }
    // Handle the actual frontend form keys
    if (formKey.startsWith('businessModelAndInnovation.reserveValuation.climateImpact.reserveSensitivity')) {
      return 'businessModel.reservesValuation.reservesSensitivity';
    }
    if (formKey.startsWith('businessModelAndInnovation.reserveValuation.climateImpact.embeddedCarbon')) {
      return 'businessModel.reservesValuation.embeddedCarbon';
    }
    if (formKey.startsWith('businessModelAndInnovation.reserveValuation.strategicCapitalAllocation.renewableEnergyInvestment')) {
      return 'businessModel.reservesValuation.renewableEnergyInvestment';
    }
    if (formKey.startsWith('businessModelAndInnovation.reserveValuation.strategicCapitalAllocation.capitalExpenditureStrategy')) {
      return 'businessModel.reservesValuation.capitalExpenditureStrategy';
    }
    if (formKey.startsWith('businessModelAndInnovation.businessEthicsAndTransparency.reservesCountriesCorruptionRisk')) {
      return 'businessModel.businessEthics.reservesCountriesCorruptionRisk';
    }
    if (formKey.startsWith('businessModelAndInnovation.businessEthicsAndTransparency.antiCorruptionManagement')) {
      return 'businessModel.businessEthics.antiCorruptionManagement';
    }

    // Leadership
    if (formKey.includes('criticalIncidentRiskManagement.processSafetyEvents')) {
      return 'leadershipGovernance.criticalIncidentRiskManagement.processSafetyEvents';
    }
    if (formKey.includes('criticalIncidentRiskManagement.catastrophicRiskManagementSystems')) {
      return 'leadershipGovernance.criticalIncidentRiskManagement.catastrophicRiskManagementSystems';
    }
    if (formKey.includes('managementOfLegalAndRegulatoryEnvironment.boardManagementOversight') || formKey.includes('boardAndManagementOversight')) {
      return 'leadershipGovernance.legalRegulatoryEnvironment.boardManagementOversight';
    }
    if (formKey.includes('managementOfLegalAndRegulatoryEnvironment.publicPolicyEngagement') || formKey.includes('managementOfTheLegalAndRegulatoryEnvironment.publicPolicyEngagement')) {
      return 'leadershipGovernance.legalRegulatoryEnvironment.publicPolicyEngagement';
    }

    return null;
  }

  private monthToNumber(month: string): string {
    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };
    return months[month.toLowerCase()] || '12';
  }
}
