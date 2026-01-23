import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Assessment, AssessmentStatus } from '@prisma/client';
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

    const currentData = (assessment.assessmentData || {}) as any;
    const submittedGroups = currentData.submittedGroups || [];

    // Check if the current path is part of a submitted group
    const isLocked = submittedGroups.some((groupPath: string) =>
      payload.path.startsWith(groupPath),
    );

    if (isLocked) {
      throw new BadRequestException(
        'Cannot save to a submitted group. Please continue the assessment or enter new data.',
      );
    }

    const merged = this.deepMerge(currentData, payload.path, payload.data);

    if (payload.lastSavedForm) {
      merged.lastSavedForm = payload.lastSavedForm;
    }

    const { data: recalculated } = await this.calculator.recalculate(merged);

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        assessmentData: recalculated as any,
        updated_by: userId,
      },
      include: { creator: true, updater: true, company: true },
    });

    await this.activitiesService.logActivity({
      companyId,
      createdById: userId,
      title: 'Assessment progress saved',
      description: `Saved form: ${payload.lastSavedForm || 'unknown'}`,
      type: 'assessment',
      status: 'updated',
    });

    return updated;
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
      // After processing, clear it so next resume goes to hub
      currentData.lastSavedForm = null;
    }

    const result = await this.calculator.recalculate(currentData);
    const recalculated = result.data as any; // ← THIS LINE FIXES THE ERROR
    const scopeTotals = result.scopeTotals;


    const requireReview = assessment.company?.requireAssessmentReview ?? false;
    let newStatus: AssessmentStatus = AssessmentStatus.in_progress;

    if (requireReview) {
      newStatus = AssessmentStatus.awaiting_review;
    } else {
      // Logic: Only set to submitted_approved if the entire pillar is complete
      // 1. Identify which pillar this submission belongs to
      let currentPillar: string | null = null;
      if (lastSavedForm) {
        const path = this.getGroupPath(lastSavedForm);
        if (path?.startsWith('environment.')) currentPillar = 'environment';
        if (path?.startsWith('socialCapital.')) currentPillar = 'socialCapital';
        if (path?.startsWith('humanCapital.')) currentPillar = 'humanCapital';
        if (path?.startsWith('businessModel.')) currentPillar = 'businessModel';
        if (path?.startsWith('leadershipGovernance.')) currentPillar = 'leadershipGovernance';
        if (path?.startsWith('foundationalData.')) currentPillar = 'foundationalData';
      }

      // 2. Check if pillar is complete
      if (currentPillar && PILLAR_GROUPS[currentPillar]) {
        const requiredGroups = PILLAR_GROUPS[currentPillar];
        const submittedSet = new Set(currentData.submittedGroups || []);
        const isComplete = requiredGroups.every((g) => submittedSet.has(g));

        if (isComplete) {
          newStatus = AssessmentStatus.submitted_approved;
        } else {
          if (assessment.status === AssessmentStatus.submitted_approved) {
            newStatus = AssessmentStatus.submitted_approved;
          }
        }
      }
    }

    if (newStatus === AssessmentStatus.submitted_approved) {
      recalculated.overallProgress = 100;
    }

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        assessmentData: recalculated as any,
        status: newStatus,
        updated_by: userId,
      },
    });

    await this.activitiesService.logActivity({
      companyId,
      createdById: userId,
      title: 'Assessment group submitted',
      description: `Group completed. Status: ${newStatus}`,
      type: 'assessment',
      status: 'submitted',
    });

    await this.reportService.saveReportingData(assessmentId);

    return {
      assessment: updated,
      scopeTotals,
      progress: recalculated.overallProgress
        ? [{ progress: recalculated.overallProgress }]
        : [],
      totals: {
        totals: {
          sum: this.getGroupSum(result.breakdown, lastSavedForm),
          breakdown: result.breakdown,
        },
      },
    };
  }

  private getGroupSum(breakdown: any, lastSavedForm?: string): number {
    if (!lastSavedForm) return 0;

    if (lastSavedForm.includes("stationary")) return breakdown.stationarySources?.sum || 0;
    if (lastSavedForm.includes("mobile")) return breakdown.mobileSources?.sum || 0;
    if (lastSavedForm.includes("process")) return breakdown.processEmissions?.sum || 0;
    if (lastSavedForm.includes("fugitive")) return breakdown.fugitiveEmissions?.sum || 0;
    if (lastSavedForm.includes("location")) return breakdown.scope2Location?.sum || 0;
    if (lastSavedForm.includes("market")) return breakdown.scope2Market?.sum || 0;
    if (lastSavedForm.includes("upstream")) return breakdown.upstreamEmissions?.sum || 0;
    if (lastSavedForm.includes("downstream")) return breakdown.downstreamEmissions?.sum || 0;

    return 0;
  }

  async getAssessments(companyId: number): Promise<Assessment[]> {
    return this.prisma.assessment.findMany({
      where: { companyId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAssessment(
    companyId: number,
    assessmentId: number,
  ): Promise<Assessment | null> {
    return this.prisma.assessment.findUnique({
      where: { id: assessmentId, companyId },
    });
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
      throw new Error('AssessmentNotFound');
    }

    if (assessment.status !== AssessmentStatus.in_progress) {
      throw new Error('AssessmentNotDraft');
    }

    await this.prisma.assessment.delete({
      where: { id: assessmentId },
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
  ): Promise<Assessment> {
    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId, companyId },
      data: {
        status: AssessmentStatus.approved,
        updated_by: currentUserId,
        rejection_reason: null,
      },
    });

    // Trigger report generation upon approval
    await this.reportService.saveReportingData(assessmentId);

    return updated;
  }

  async declineAssessment(
    companyId: number,
    currentUserId: number,
    assessmentId: number,
    rejectionReason: string,
  ): Promise<Assessment> {
    const assessmentWithCreator = await this.prisma.assessment.findFirst({
      where: { id: assessmentId },
      select: {
        company: {
          select: {
            name: true,
          },
        },
        creator: {
          select: {
            email: true,
            first_name: true,
          },
        },
      },
    });
    const creatorEmail = assessmentWithCreator?.creator?.email;
    const first_name = assessmentWithCreator?.creator?.first_name || '';
    const company_name = assessmentWithCreator?.company?.name || '';
    if (!creatorEmail)
      throw new Error('Creator email not found for this assessment');

    await this.emailService.sendEmail(
      creatorEmail,
      { first_name, company_name, reason: rejectionReason },
      17,
    );
    return this.prisma.assessment.update({
      where: { id: assessmentId, companyId },
      data: {
        status: AssessmentStatus.declined,
        updated_by: currentUserId,
        rejection_reason: rejectionReason,
      },
    });
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
    if (formKey.startsWith('ghg-scope3-downstream')) {
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
    if (formKey === 'hydrocarbon-spills') {
      return 'environment.biodiversityImpact.environmentalManagement.hydrocarbonSpills';
    }
    if (formKey === 'environmental-management-policies') {
      return 'environment.biodiversityImpact.environmentalManagement.environmentalManagementPolicies';
    }
    if (formKey === 'reserves-in-sensitive-areas') {
      return 'environment.biodiversityImpact.environmentalManagement.reservesInSensitiveAreas';
    }

    if (formKey === 'foundational-activity-production') {
      return 'foundationalData.activityMetrics.productionVolumes';
    }
    if (formKey === 'foundational-activity-offshore') {
      return 'foundationalData.activityMetrics.offshoreSites';
    }
    if (formKey === 'foundational-activity-terrestrial') {
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
    if (formKey.startsWith('soc-security-conflict')) {
      return 'socialCapital.securityHumanRights.operationsInConflictZones';
    }
    if (formKey.startsWith('soc-security-indigenous')) {
      return 'socialCapital.securityHumanRights.reservesInNearIndigenousLand';
    }
    if (formKey.startsWith('soc-security-engagement')) {
      return 'socialCapital.securityHumanRights.humanRightsEngagementProcesses';
    }
    if (formKey.startsWith('soc-community-risk')) {
      return 'socialCapital.communityRelations.communityRiskOpportunityManagement';
    }
    if (formKey.startsWith('soc-community-hcdt')) {
      return 'socialCapital.communityRelations.hcdtContribution';
    }
    if (formKey.startsWith('soc-community-dispute')) {
      return 'socialCapital.communityRelations.communityDisputeResolution';
    }
    if (formKey.startsWith('soc-community-delays')) {
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
    if (formKey.includes('reserveValuation.climateImpact.reserveSensitivity')) {
      return 'businessModel.reservesValuation.reservesSensitivity';
    }
    if (formKey.includes('reserveValuation.climateImpact.embeddedCarbon')) {
      return 'businessModel.reservesValuation.embeddedCarbon';
    }
    if (formKey.includes('strategicCapitalAllocation.renewableEnergyInvestment')) {
      return 'businessModel.reservesValuation.renewableEnergyInvestment';
    }
    if (formKey.includes('strategicCapitalAllocation.capitalExpenditureStrategy')) {
      return 'businessModel.reservesValuation.capitalExpenditureStrategy';
    }
    if (formKey.includes('businessEthicsAndTransparency.reservesCountriesCorruptionRisk')) {
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
    if (formKey.includes('managementOfLegalAndRegulatoryEnvironment.boardManagementOversight')) {
      return 'leadershipGovernance.legalRegulatoryEnvironment.boardManagementOversight';
    }
    if (formKey.includes('managementOfLegalAndRegulatoryEnvironment.publicPolicyEngagement')) {
      return 'leadershipGovernance.legalRegulatoryEnvironment.publicPolicyEngagement';
    }

    return null;
  }
}
