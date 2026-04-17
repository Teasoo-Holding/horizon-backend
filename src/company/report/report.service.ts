import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  getPercentage,
  // extractFuelMixBreakdown,
  // getTop5ByFuelType,
  // sumScope1Values,
} from './entities/helpers';
import { TOTAL_GROUP_COUNT } from '../assessments/common/group-keys';
import { ScoringService } from '../../assessment/scoring/scoring.service';

export interface EvidenceFile {
  name: string;
  url: string;
  section: string;
  size?: number;
  uploadedAt?: string;
}

export interface ReportEvidence {
  environmental: EvidenceFile[];
  socialCapital: EvidenceFile[];
  humanCapital: EvidenceFile[];
  businessModel: EvidenceFile[];
  leadershipAndGovernance: EvidenceFile[];
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);
  constructor(private prisma: PrismaService, private scoringService: ScoringService) { }

  /* ─── Evidence file extraction helpers ─── */

  private extractFiles(obj: any, section: string, target: EvidenceFile[]) {
    if (!obj) return;
    const push = (f: any) => {
      if (f?.url)
        target.push({
          name: f.name || 'File',
          url: f.url,
          section,
          size: f.size,
          uploadedAt: f.uploadedAt || f.createdAt,
        });
    };
    if (obj.files && typeof obj.files === 'object') {
      Object.values(obj.files).forEach(push);
    }
    if (Array.isArray(obj.additionalFields)) {
      obj.additionalFields.forEach(push);
    }
    if (Array.isArray(obj.filesAndLinks)) {
      obj.filesAndLinks.forEach(push);
    }
  }

  private collectEvidenceByPillar(data: any): ReportEvidence {
    const environmental: EvidenceFile[] = [];
    const socialCapital: EvidenceFile[] = [];
    const humanCapital: EvidenceFile[] = [];
    const businessModel: EvidenceFile[] = [];
    const leadershipAndGovernance: EvidenceFile[] = [];

    const env = data?.environment || {};
    const ghg = env.ghg || {};
    const scope1 = ghg.scope1 || {};
    const scope2 = ghg.scope2 || {};
    const scope3 = ghg.scope3 || {};
    const upstream = scope3.upstream || {};
    const downstream = scope3.downstream || {};

    // Scope 1
    this.extractFiles(scope1.stationarySources?.electricityHeat, 'Stationary - Electricity & Heat', environmental);
    this.extractFiles(scope1.stationarySources?.industrialProcesses, 'Stationary - Industrial', environmental);
    this.extractFiles(scope1.stationarySources?.oilGasOperations, 'Stationary - Oil & Gas', environmental);
    this.extractFiles(scope1.mobileSources?.roadTransport, 'Mobile - Road Transport', environmental);
    this.extractFiles(scope1.mobileSources?.vehicleEquipment, 'Mobile - Vehicle Equipment', environmental);
    this.extractFiles(scope1.mobileSources?.marineAviation, 'Mobile - Marine/Aviation', environmental);
    this.extractFiles(scope1.processEmissions?.cementManufacturing, 'Process - Cement', environmental);
    this.extractFiles(scope1.processEmissions?.gasFlaring, 'Process - Gas Flaring', environmental);
    this.extractFiles(scope1.fugitiveEmissions?.ventingNaturalGas, 'Fugitive - Venting', environmental);
    this.extractFiles(scope1.fugitiveEmissions?.hfcLeaks, 'Fugitive - HFC Leaks', environmental);

    // Scope 2
    this.extractFiles(scope2.locationBased?.electricity, 'Scope 2 - Location Electricity', environmental);
    this.extractFiles(scope2.locationBased?.cooling, 'Scope 2 - Location Cooling', environmental);
    this.extractFiles(scope2.locationBased?.steam, 'Scope 2 - Location Steam', environmental);
    this.extractFiles(scope2.locationBased?.heating, 'Scope 2 - Location Heating', environmental);
    this.extractFiles(scope2.marketBased?.ipps, 'Scope 2 - Market IPPs', environmental);
    this.extractFiles(scope2.marketBased?.eac, 'Scope 2 - Market EAC', environmental);
    this.extractFiles(scope2.marketBased?.residual, 'Scope 2 - Market Residual', environmental);
    this.extractFiles(scope2.marketBased?.coolingSteam, 'Scope 2 - Market Cooling/Steam', environmental);

    // Scope 3
    this.extractFiles(upstream.purchasedGoodsAndServices, 'Scope 3 - Purchased Goods', environmental);
    this.extractFiles(upstream.capitalGoods, 'Scope 3 - Capital Goods', environmental);
    this.extractFiles(upstream.fuelEnergyRelatedActivities, 'Scope 3 - Fuel/Energy Related', environmental);
    this.extractFiles(upstream.upstreamTransportationDistribution, 'Scope 3 - Upstream Transport', environmental);
    this.extractFiles(upstream.wasteGeneratedInOperations, 'Scope 3 - Waste in Ops', environmental);
    this.extractFiles(upstream.businessTravel, 'Scope 3 - Business Travel', environmental);
    this.extractFiles(upstream.employeeCommuting, 'Scope 3 - Employee Commuting', environmental);
    this.extractFiles(upstream.upstreamLeasedAssets, 'Scope 3 - Upstream Leased', environmental);
    this.extractFiles(downstream.downstreamTransportationDistribution, 'Scope 3 - Downstream Transport', environmental);
    this.extractFiles(downstream.processingSoldProducts, 'Scope 3 - Processing Sold', environmental);
    this.extractFiles(downstream.useOfSoldProducts, 'Scope 3 - Use of Sold', environmental);
    this.extractFiles(downstream.endOfLifeTreatment, 'Scope 3 - End of Life', environmental);
    this.extractFiles(downstream.downstreamLeasedAssets, 'Scope 3 - Downstream Leased', environmental);
    this.extractFiles(downstream.franchises, 'Scope 3 - Franchises', environmental);
    this.extractFiles(downstream.investments, 'Scope 3 - Investments', environmental);

    // Air Quality, Water, Biodiversity
    this.extractFiles(env.airQuality?.airPollutantEmissions, 'Air Quality', environmental);
    this.extractFiles(env.waterManagement?.waterAndProducedWaterManagement, 'Water Management', environmental);
    this.extractFiles(env.waterManagement?.hydraulicFracturingImpacts, 'Hydraulic Fracturing', environmental);
    this.extractFiles(env.biodiversityImpact?.environmentalManagement, 'Biodiversity', environmental);

    // ── Social Capital ──
    const soc = data?.socialCapital || {};
    const secRights = soc.securityRights || {};
    const comRel = soc.communityRelations || {};

    this.extractFiles(secRights.reservesAreaConflict, 'Reserves in Conflict Areas', socialCapital);
    this.extractFiles(secRights.reservesIndigenousLand, 'Indigenous Land', socialCapital);
    this.extractFiles(secRights.humanRightEngagement, 'Human Rights Engagement', socialCapital);
    this.extractFiles(comRel.hcdtContribution, 'HCDT Contribution', socialCapital);
    this.extractFiles(comRel.communityRisk, 'Community Risk Management', socialCapital);
    this.extractFiles(comRel.communityDisputeResolution, 'Dispute Resolution', socialCapital);
    this.extractFiles(comRel.operationalDelays, 'Operational Delays', socialCapital);

    // ── Human Capital ──
    const hum = data?.humanCapital || {};
    const humRisk = hum.riskAndOpportunityManagement || {};
    const humHSP = humRisk.healthAndSafetyPerformance || {};

    this.extractFiles(humHSP.direct, 'Direct Employees - Health & Safety', humanCapital);
    this.extractFiles(humHSP.contract, 'Contract Employees - Health & Safety', humanCapital);
    this.extractFiles(humRisk.safetyManagementSystems, 'Safety Management Systems', humanCapital);

    // ── Business Model ──
    const bus = data?.businessInnovation || {};
    const busReserves = bus.reservesValuationAndCapitalExpenditures || {};
    const busEthics = bus.businessEthicsAndTransparency || {};

    this.extractFiles(busReserves.reservesSensitivityToCarbonPricing, 'Carbon Pricing Sensitivity', businessModel);
    this.extractFiles(busReserves.embeddedCarbonInReserves, 'Embedded Carbon', businessModel);
    this.extractFiles(busReserves.renewableEnergyInvestment, 'Renewable Energy Investment', businessModel);
    this.extractFiles(busReserves.capitalExpenditureStrategy, 'Capital Expenditure Strategy', businessModel);
    this.extractFiles(busEthics.antiCorruptionManagementSystem, 'Anti-Corruption Management', businessModel);
    this.extractFiles(busEthics.reservesInCountriesWithHighCorruptionRisk, 'Corruption Risk Reserves', businessModel);

    // ── Leadership & Governance ──
    const lead = data?.leadershipGovernance || {};
    const crit = lead.criticalIncidentRiskManagement || {};
    const legal = lead.managementOfTheLegalAndRegulatoryEnvironment || lead.legalRegulatoryEnvironment || {};

    this.extractFiles(crit.processSafetyEvents, 'Process Safety Events', leadershipAndGovernance);
    this.extractFiles(crit.catastrophicRiskManagementSystems, 'Catastrophic Risk Management', leadershipAndGovernance);
    this.extractFiles(legal.boardAndManagementOversight, 'Board & Management Oversight', leadershipAndGovernance);
    this.extractFiles(legal.publicPolicyEngagement, 'Public Policy Engagement', leadershipAndGovernance);

    return { environmental, socialCapital, humanCapital, businessModel, leadershipAndGovernance };
  }

  async findOrganizationAssessmentReport(id: number) {
    const report = await this.prisma.assessment.findMany({
      where: {
        companyId: id,
      },
      select: {
        id: true,
        startMonth: true,
        startYear: true,
        endMonth: true,
        endYear: true,
        subsidiary: true,
        status: true,
        assessmentData: true,
        report: {
          select: {
            progress: true,
            completed_sections: true,
            total_sections: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });
    return report.map((r: any) => {
      const data = (r.assessmentData || {}) as any;
      const submittedGroups: string[] = Array.isArray(data.submittedGroups) ? data.submittedGroups : [];
      const completedSections = submittedGroups.length;
      const totalSections = TOTAL_GROUP_COUNT;
      const progress = totalSections > 0
        ? parseFloat(((completedSections / totalSections) * 100).toFixed(2))
        : 0;
      return {
        ...r,
        progress,
        completed_sections: completedSections,
        total_sections: totalSections,
        report: undefined,
        assessmentData: undefined
      };
    });
  }

  async getAssessmentReport(id: number) {
    return await this.prisma.report.findUnique({
      where: { id }
    })
  }

  async saveReportingData(id: number) {
    const sumSummary = await this.prisma.assessment.findUnique({
      where: { id },
    });

    if (!sumSummary) {
      throw new NotFoundException(`Assessment with ID ${id} not found for report generation.`);
    }

    const report = (sumSummary.assessmentData || {}) as any;
    const ghg = report?.environment?.ghg;
    const socialCapital = report?.socialCapital || {};
    const humanCapital = report?.humanCapital || {};
    const businessModel = report?.businessInnovation || {};
    const leadershipGovernance = report?.leadershipGovernance || {};

    const result = {
      ghg_total_emissions: report?.totalEmission ?? 0,
      ghg_scope_one: ghg?.scope1?.totalEmission ?? 0,
      ghg_scope_two: ghg?.scope2?.totalEmission ?? 0,
      ghg_scope_three: ghg?.scope3?.totalEmission ?? 0,
      progress: Math.round((report?.overallProgress as number) ?? 0),
      ghg_datacount_scope_one: ghg?.scope1?.dataCount?.count ?? 0,
      ghg_datacount_scope_two: ghg?.scope2?.dataCount?.count ?? 0,
      ghg_datacount_scope_three: ghg?.scope3?.dataCount?.count ?? 0,
      environmental_total_emissions: report?.environment?.totalEmission ?? report?.totalEmission ?? 0,
      environmental_scope_one: ghg?.scope1?.totalEmission ?? 0,
      environmental_scope_two: ghg?.scope2?.totalEmission ?? 0,
      environmental_scope_three: ghg?.scope3?.totalEmission ?? 0,
      environmental_datacount_scope_one: ghg?.scope1?.dataCount?.count ?? 0,
      environmental_datacount_scope_two: ghg?.scope2?.dataCount?.count ?? 0,
      environmental_datacount_scope_three: ghg?.scope3?.dataCount?.count ?? 0,
      startMonth: sumSummary?.startMonth,
      startYear: sumSummary?.startYear,
      endMonth: sumSummary?.endMonth,
      endYear: sumSummary?.endYear,
      subsidiary: sumSummary?.subsidiary,
      social_total_emissions: 0,
      social_scope_one: 0,
      social_scope_two: 0,
      social_scope_three: 0,
      social_datacount_scope_one: Object.keys(socialCapital.securityRights || {}).length + Object.keys(socialCapital.communityRelations || {}).length,
      social_datacount_scope_two: 0,
      social_datacount_scope_three: 0,
      governance_total_emissions: 0,
      governance_scope_one: 0,
      governance_scope_two: 0,
      governance_scope_three: 0,
      governance_datacount_scope_one: 0,
      governance_datacount_scope_two: 0,
      governance_datacount_scope_three: 0,
      // Human Capital metrics
      human_total_emissions: 0,
      human_scope_one: 0,
      human_scope_two: 0,
      human_scope_three: 0,
      human_datacount_scope_one: Object.keys(humanCapital.workforceHealthAndSafety || {}).length + Object.keys(humanCapital.riskAndOpportunityManagement || {}).length,
      human_datacount_scope_two: 0,
      human_datacount_scope_three: 0,
      // Business Model metrics
      business_total_emissions: 0,
      business_scope_one: 0,
      business_scope_two: 0,
      business_scope_three: 0,
      business_datacount_scope_one: Object.keys(businessModel.reservesValuationAndCapitalExpenditures || {}).length + Object.keys(businessModel.businessEthicsAndTransparency || {}).length,
      business_datacount_scope_two: 0,
      business_datacount_scope_three: 0,
      // Leadership & Governance metrics
      leadership_total_emissions: 0,
      leadership_scope_one: 0,
      leadership_scope_two: 0,
      leadership_scope_three: 0,
      leadership_datacount_scope_one: Object.keys(leadershipGovernance.criticalIncidentRiskManagement || {}).length + Object.keys(leadershipGovernance.legalRegulatoryEnvironment || {}).length,
      leadership_datacount_scope_two: 0,
      leadership_datacount_scope_three: 0,
      completed_sections: report?.completedSections ?? 0,
      total_sections: report?.totalSections ?? 100,
    };

    const esgEvaluation = this.scoringService.calculateESGScore(report, result);

    const fullResult = {
      ...result,
      esgScore: esgEvaluation.overallScore,
      esgGrade: esgEvaluation.overallGrade,
      esgPillars: esgEvaluation.pillars as any,
    };

    const saved = await this.prisma.report.upsert({
      where: { assessmentId: id },
      update: fullResult,
      create: { assessmentId: id, ...fullResult },
    });

    this.logger.log(`Report saved: ${saved.id}`);

    const nestedResult = {
      ghg: {
        total: result.ghg_total_emissions,
        scope1: { total: result.ghg_scope_one, dataCount: result.ghg_datacount_scope_one },
        scope2: { total: result.ghg_scope_two, dataCount: result.ghg_datacount_scope_two },
        scope3: { total: result.ghg_scope_three, dataCount: result.ghg_datacount_scope_three },
      },
      environment: {
        total: result.environmental_total_emissions,
        scope1: result.environmental_scope_one,
        scope2: result.environmental_scope_two,
        scope3: result.environmental_scope_three,
      }
    };

    return { result: nestedResult, totals: result };
  }


  async getReport(id: number, companyId: number) {
    const record = await this.prisma.assessment.findUnique({
      where: { id, companyId },
    });

    if (!record) {
      throw new NotFoundException(`Assessment with ID ${id} not found.`);
    }

    // Fetch previous assessment for change percentage calculations
    const previousRecord = await this.prisma.assessment.findFirst({
      where: {
        companyId,
        createdAt: { lt: record.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    let currentData: any = {};
    try {
      currentData = (typeof record.assessmentData === 'string'
        ? JSON.parse(record.assessmentData)
        : record.assessmentData || {}) as any;
    } catch {
      this.logger.warn(`Malformed assessmentData JSON for assessment ${id}`);
    }

    let previousData: any = null;
    if (previousRecord?.assessmentData) {
      try {
        previousData = (typeof previousRecord.assessmentData === 'string'
          ? JSON.parse(previousRecord.assessmentData)
          : previousRecord.assessmentData) as any;
      } catch {
        this.logger.warn(`Malformed assessmentData JSON for previous assessment`);
      }
    }

    // Helper for change percentage
    const getChange = (current: number, previous: number) => {
      // Return null if previous data is missing (true first entry — frontend
      // hides the trend badge via the changePercentage != null check).
      if (!previous || previous === 0) return null;
      const pct = ((current - previous) / previous) * 100;
      // Cap: if the change exceeds ±500%, the previous baseline is almost
      // certainly stale/test data or an incomplete prior report — no
      // meaningful YoY comparison is possible. Real operational changes
      // (oil & gas) rarely exceed ±100% YoY; ±500% is a generous safety
      // threshold. Returning null lets the frontend hide the trend badge
      // instead of rendering misleading numbers like "50,267% increase".
      if (Math.abs(pct) > 500) return null;
      return Number(pct.toFixed(1));
    };

    // Helper for safe number access
    const getNum = (val: any) => (val && !isNaN(Number(val)) ? Number(val) : 0);

    // Fetch trend data (only assessments up to and including the current one)
    const trendData = await this.prisma.assessment.findMany({
      where: { companyId, createdAt: { lte: record.createdAt } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        startMonth: true,
        startYear: true,
        endMonth: true,
        endYear: true,
        report: {
          select: {
            ghg_scope_one: true,
            ghg_scope_two: true,
            ghg_scope_three: true,
            ghg_total_emissions: true,
          },
        },
      },
    });

    const formatHistory = (data: any[], key: string) => {
      return data
        .filter(t => t.report != null)
        .map(t => ({
          score: t.report[key] ?? 0,
          period: `${t.startMonth} ${t.startYear} - ${t.endMonth} ${t.endYear}`
        })).reverse();
    };

    const targets = await this.prisma.target.findMany({
      where: { companyId },
      include: { scopeTargets: true, generalTarget: true },
      orderBy: { createdAt: 'desc' },
    });

    // The trend chart needs ACTUAL DATES (not just years) on the X axis so
    // baseline → current → target points sit at the right elapsed-time
    // positions. Resolve a baseline assessment per target row by matching
    // on `target.baselineYear` and pulling its approval / submission date.
    // Current point comes from the report's own assessment (`record`).
    const baselineAssessmentForYear = async (baselineYear: number) => {
      const baseline = await this.prisma.assessment.findFirst({
        where: { companyId, startYear: String(baselineYear) },
        orderBy: { createdAt: 'asc' }, // FIRST assessment of the baseline year
        select: { approvedAt: true, submittedAt: true, assessmentData: true },
      });
      return baseline;
    };

    const decorateTarget = async (t: typeof targets[number] | null) => {
      if (!t) return null;
      const baseline = await baselineAssessmentForYear(t.baselineYear);
      const baselineData = baseline?.assessmentData as any;

      // ── Refresh emission values from the assessment data (same pattern
      //    as getLatestTargetPair in target.service.ts). Without this the
      //    General target row can have stale/zero baselineYearEmission in
      //    the DB if the target was created before the baseline assessment
      //    was approved — and the chart skips lines where all values are 0.
      const totalEmission = currentData?.totalEmission ?? 0;
      const scopeTotals = currentData?.environment?.ghg;

      if (t.type === 'GENERAL' && t.generalTarget) {
        const baselineEmission = baselineData?.totalEmission ?? t.generalTarget.baselineYearEmission ?? 0;
        const reductionPct = t.generalTarget.reductionPercentage ?? 0;
        await this.prisma.generalTarget.update({
          where: { targetId: t.id },
          data: {
            currentEmission: totalEmission,
            baselineYearEmission: baselineEmission,
            targetEmission: baselineEmission * (1 - reductionPct / 100),
          },
        });
        // Patch the in-memory object so the response reflects the refresh
        t.generalTarget.currentEmission = totalEmission;
        t.generalTarget.baselineYearEmission = baselineEmission;
        t.generalTarget.targetEmission = baselineEmission * (1 - reductionPct / 100);
      }

      if (t.type === 'SCOPE' && t.scopeTargets?.length) {
        const baselineScopeTotals = baselineData?.environment?.ghg;
        const scopeUpdates = [
          { scope: 'SCOPE1' as const, current: scopeTotals?.scope1?.totalEmission ?? 0, baseline: baselineScopeTotals?.scope1?.totalEmission ?? 0 },
          { scope: 'SCOPE2' as const, current: scopeTotals?.scope2?.totalEmission ?? 0, baseline: baselineScopeTotals?.scope2?.totalEmission ?? 0 },
          { scope: 'SCOPE3' as const, current: scopeTotals?.scope3?.totalEmission ?? 0, baseline: baselineScopeTotals?.scope3?.totalEmission ?? 0 },
        ];
        await this.prisma.$transaction(
          scopeUpdates.map((se) =>
            this.prisma.scopeTarget.updateMany({
              where: { targetId: t.id, scope: se.scope },
              data: { currentEmission: se.current, baselineYearEmission: se.baseline },
            }),
          ),
        );
        // Patch the in-memory scope targets
        for (const se of scopeUpdates) {
          const st = t.scopeTargets.find((s) => s.scope === se.scope);
          if (st) {
            st.currentEmission = se.current;
            st.baselineYearEmission = se.baseline;
          }
        }
      }

      // Prefer approvedAt; fall back to submittedAt; last resort the year
      // mid-point (Jul 1) so the chart still has *some* date to plot.
      const baselineDate =
        baseline?.approvedAt?.toISOString() ??
        baseline?.submittedAt?.toISOString() ??
        new Date(`${t.baselineYear}-07-01T00:00:00Z`).toISOString();
      const currentDate =
        record.approvedAt?.toISOString() ??
        record.submittedAt?.toISOString() ??
        record.updatedAt?.toISOString() ??
        record.createdAt.toISOString();
      const currentAssessmentYear = record.startYear ? Number(record.startYear) : null;
      return { ...t, baselineDate, currentDate, currentAssessmentYear };
    };

    // A company can have BOTH a GENERAL target row AND a SCOPE target row
    // (independent records, different `type` values). The previous response
    // returned `targets[0]` — only the most-recently-created row — which
    // dropped the other on the floor. Pick the most recent of each type so
    // the report viewer can render both on the trend chart.
    const targetPair = {
      general: await decorateTarget(targets.find((t) => t.type === 'GENERAL') ?? null),
      scope: await decorateTarget(targets.find((t) => t.type === 'SCOPE') ?? null),
    };

    const report = await this.prisma.report.findUnique({
      where: { assessmentId: id },
    });

    // Environmental
    const env = currentData.environment || {};
    const prevEnv = previousData?.environment || {};

    const airPollutants = env.airQuality?.airPollutantEmissions || {};
    const airCalculated = airPollutants.calculated?.breakdown || {};
    const air = {
      oxidesOfNitrogen: airPollutants.oxidesOfNitrogen ?? airCalculated.oxidesOfNitrogen?.volume ?? 0,
      oxidesOfSulphur: airPollutants.oxidesOfSulphur ?? airPollutants.oxidesOfSuplphur ?? airCalculated.oxidesOfSulphur?.volume ?? 0,
      volatileOrganicCompounds: airPollutants.volatileOrganicCompounds ?? airPollutants.volatileOrganicCompound ?? airCalculated.volatileOrganicCompounds?.volume ?? 0,
      particulateMatter: airPollutants.particulateMatter ?? airCalculated.particulateMatter?.volume ?? 0,
    };

    const water = env.waterManagement || {};
    const waterAndProduced = water.waterAndProducedWaterManagement || {};

    const freshwaterCalculated = waterAndProduced.freshwaterWithdrawals?.calculated || {};
    const producedWaterCalculated = waterAndProduced.producedWaterManagement?.calculated || {};

    const hydraulicFracturing = water.hydraulicFracturingImpacts || {};

    const biodiversityManagement = env.biodiversityImpact?.environmentalManagement || {};
    const hydrocarbonSpillsCalculated = biodiversityManagement.hydrocarbonSpills?.calculated || {};
    const hydrocarbonSpillsDirect = biodiversityManagement.hydrocarbonSpills || {};
    const reservesCalculated = biodiversityManagement.reservesInSensitiveAreas?.calculated || {};
    const reservesDirect = biodiversityManagement.reservesInSensitiveAreas || {};

    // Activity Metrics — canonical location is foundationalData.activityMetrics
    // (AssessmentCalculatorService migrates root-level activityMetrics there and
    // deletes the root copy). Fall back to the legacy root path for assessments
    // created before the migration landed.
    const am = currentData.foundationalData?.activityMetrics || currentData.activityMetrics || {};
    const prod = am.productionVolume || am.productionData || {};
    const asset = am.assetPortfolio || {};
    const assetOffshore = asset.offshoreSites || am.offshoreSites || {};
    const assetTerrestrial = asset.terrestrialSites || am.terrestrialSites || {};

    // Social Capital
    const soc = currentData.socialCapital || {};
    const sec = soc.securityRights || soc.securityHumanRights || {};
    const com = soc.communityRelations || {};

    // Human Capital
    const hum = currentData.humanCapital || {};
    const humWorkforce = hum.workforceHealthAndSafety || {};
    const humRiskManagement = hum.riskAndOpportunityManagement || {};
    const humHealthSafety = humRiskManagement.healthAndSafetyPerformance || {};

    // Business Model (data stored at assessmentData.businessInnovation.*)
    const bus = currentData.businessInnovation || {};
    const busReserves = bus.reservesValuationAndCapitalExpenditures || {};
    const busClimateImpact = busReserves.reservesSensitivityToCarbonPricing || {};
    const busEmbedded = busReserves.embeddedCarbonInReserves || {};
    const busRenewable = busReserves.renewableEnergyInvestment || {};
    const busCapex = busReserves.capitalExpenditureStrategy || {};
    const busEthics = bus.businessEthicsAndTransparency || {};
    const busAntiCorruption = busEthics.antiCorruptionManagementSystem || {};
    const busCorruptionRisk = busEthics.reservesInCountriesWithHighCorruptionRisk || {};

    // Leadership & Governance
    const lead = currentData.leadershipGovernance || currentData.environment?.leadershipGovernance || {};
    const crit = lead.criticalIncidentRiskManagement || {};
    const legal = lead.managementOfTheLegalAndRegulatoryEnvironment || lead.legalRegulatoryEnvironment || {};

    // Scope Totals (Prefer calculated data from assessmentData if available)
    const scope1_live = getNum(env.ghg?.scope1?.totalEmission);
    const scope2_live = getNum(env.ghg?.scope2?.totalEmission);
    const scope3_live = getNum(env.ghg?.scope3?.totalEmission);

    // Defensive fallback: sum sub-group totals when scope-level total is missing
    const scope1_groups = getNum(env.ghg?.scope1?.stationarySources?.totalEmission)
      + getNum(env.ghg?.scope1?.mobileSources?.totalEmission)
      + getNum(env.ghg?.scope1?.processEmissions?.totalEmission)
      + getNum(env.ghg?.scope1?.fugitiveEmissions?.totalEmission);
    // TODO: GHG Protocol requires reporting EITHER location-based or market-based
    // as the primary Scope 2 figure, not both summed. Summing both double-counts
    // when a company fills in both methods. Needs product decision on which to prefer.
    const scope2_groups = getNum(env.ghg?.scope2?.locationBased?.totalEmission)
      + getNum(env.ghg?.scope2?.marketBased?.totalEmission);
    const scope3_groups = getNum(env.ghg?.scope3?.upstream?.totalEmission)
      + getNum(env.ghg?.scope3?.downstream?.totalEmission);

    // Use first non-null/undefined value (|| would skip legitimate 0)
    const firstDefined = (...vals: number[]) => vals.find(v => v > 0) ?? vals[0] ?? 0;
    const scope1 = firstDefined(scope1_live, scope1_groups, report?.ghg_scope_one ?? 0);
    const scope2 = firstDefined(scope2_live, scope2_groups, report?.ghg_scope_two ?? 0);
    const scope3 = firstDefined(scope3_live, scope3_groups, report?.ghg_scope_three ?? 0);
    const scopeSum = scope1 + scope2 + scope3;
    const totalEmissions = scopeSum > 0 ? scopeSum : (report?.ghg_total_emissions ?? getNum(currentData.totalEmission));

    // Derive previous scope totals with the same fallback strategy as current
    const prevScope1 = firstDefined(
      getNum(prevEnv.ghg?.scope1?.totalEmission),
      getNum(prevEnv.ghg?.scope1?.stationarySources?.totalEmission)
      + getNum(prevEnv.ghg?.scope1?.mobileSources?.totalEmission)
      + getNum(prevEnv.ghg?.scope1?.processEmissions?.totalEmission)
      + getNum(prevEnv.ghg?.scope1?.fugitiveEmissions?.totalEmission),
    );
    const prevScope2 = firstDefined(
      getNum(prevEnv.ghg?.scope2?.totalEmission),
      getNum(prevEnv.ghg?.scope2?.locationBased?.totalEmission)
      + getNum(prevEnv.ghg?.scope2?.marketBased?.totalEmission),
    );
    const prevScope3 = firstDefined(
      getNum(prevEnv.ghg?.scope3?.totalEmission),
      getNum(prevEnv.ghg?.scope3?.upstream?.totalEmission)
      + getNum(prevEnv.ghg?.scope3?.downstream?.totalEmission),
    );
    const prevTotal = prevScope1 + prevScope2 + prevScope3 || getNum(prevEnv.totalEmission);

    const scope1_percentage = getPercentage(scope1, totalEmissions);
    const scope2_percentage = getPercentage(scope2, totalEmissions);
    const scope3_percentage = getPercentage(scope3, totalEmissions);

    // Business Model: compute reserves at risk from sub-fields
    const provedReserves = getNum(busEmbedded.totalProvedReserves);
    const riskPercent = getNum(busClimateImpact.percentageDecrease);
    const estimatedDecreaseMMboe = getNum(busClimateImpact.estimatedDecrease);
    // Use the form's explicit estimated decrease if available, otherwise derive from percentage
    const computedReservesAtRisk = estimatedDecreaseMMboe > 0
      ? estimatedDecreaseMMboe
      : riskPercent > 0
        ? Number((provedReserves * (riskPercent / 100)).toFixed(2))
        : 0;

    // Leadership: compute process safety event rate from actual form data
    const pseTotalHours = getNum(crit.processSafetyEvents?.totalHoursWorked);
    const pseEvents = getNum(crit.processSafetyEvents?.numberOfEvents);
    const computedPSER = pseTotalHours > 0
      ? Number(((pseEvents / pseTotalHours) * 200000).toFixed(2))
      : 0;

    return {
      activityMetrics: {
        productionData: {
          oilProduction: {
            crudeOil: getNum(prod.crudeOilProductionVolume || prod.oilProduction?.crudeOil),
            syntheticOil: getNum(prod.syntheticOilProductionVolume || prod.oilProduction?.syntheticOil),
          },
          gasProduction: {
            naturalGas: getNum(prod.naturalGasProductionVolume || prod.gasProduction?.naturalGas),
            syntheticGas: getNum(prod.syntheticGasProductionVolume || prod.gasProduction?.syntheticGas),
          }
        },
        assetPortfolio: {
          offshoreSites: {
            totalNumber: getNum(assetOffshore.totalNumber),
            productionPlatforms: getNum(assetOffshore.productionPlatforms),
            FPSOs: getNum(assetOffshore.FPSOs),
            otherSites: getNum(assetOffshore.otherSites),
          },
          terrestrialSites: {
            totalNumber: getNum(assetTerrestrial.totalNumber),
            flowStations: getNum(assetTerrestrial.flowStations),
            gasProcessingPlants: getNum(assetTerrestrial.gasProcessingPlants),
            otherSites: getNum(assetTerrestrial.otherSites),
          },
        },
      },
      environmental: {
        total_emission: totalEmissions,
        desc: env.desc || "",
        changePercentage: getChange(totalEmissions, prevTotal),
        greenhouseGasEmission: {
          totalEmissions: totalEmissions,
          totalChange: getChange(totalEmissions, prevTotal),
          totalHistory: formatHistory(trendData, 'ghg_total_emissions'),
          scope1Emissions: scope1,
          scope1Change: getChange(scope1, prevScope1),
          scope1History: formatHistory(trendData, 'ghg_scope_one'),
          scope2Emissions: scope2,
          scope2Change: getChange(scope2, prevScope2),
          scope2History: formatHistory(trendData, 'ghg_scope_two'),
          scope3Emissions: scope3,
          scope3Change: getChange(scope3, prevScope3),
          scope3History: formatHistory(trendData, 'ghg_scope_three'),
        },
        airQuality: {
          totalEmission: (getNum(air.oxidesOfNitrogen) + getNum(air.oxidesOfSulphur) + getNum(air.volatileOrganicCompounds) + getNum(air.particulateMatter)),
          nox: getNum(air.oxidesOfNitrogen),
          sox: getNum(air.oxidesOfSulphur),
          voc: getNum(air.volatileOrganicCompounds),
          pm10: getNum(air.particulateMatter),
        },
        waterManagement: {
          totalWaterWithdrawal: getNum(freshwaterCalculated.withdrawals?.surfaceWater?.volume) + getNum(freshwaterCalculated.withdrawals?.groundwater?.volume) + getNum(freshwaterCalculated.withdrawals?.municipal?.volume),
          totalWaterConsumed: getNum(freshwaterCalculated.withdrawals?.totalConsumed?.volume),
          totalProducedWaterGenerated: getNum(producedWaterCalculated.totalProducedWater?.volume)
            || getNum(freshwaterCalculated.producedWater?.generated?.volume)
            || ((getNum(producedWaterCalculated.recycledReused?.volume) || getNum(freshwaterCalculated.producedWater?.recycled?.volume))
              + (getNum(producedWaterCalculated.injectedForDisposal?.volume) || getNum(freshwaterCalculated.producedWater?.injected?.volume))
              + (getNum(producedWaterCalculated.dischargedToSurface?.volume) || getNum(freshwaterCalculated.producedWater?.discharged?.volume))),
          recycledWater: getNum(producedWaterCalculated.recycledReused?.volume) || getNum(freshwaterCalculated.producedWater?.recycled?.volume),
          injectedForDisposal: getNum(producedWaterCalculated.injectedForDisposal?.volume) || getNum(freshwaterCalculated.producedWater?.injected?.volume),
          dischargedToSurface: getNum(producedWaterCalculated.dischargedToSurface?.volume) || getNum(freshwaterCalculated.producedWater?.discharged?.volume),
          averageHydrocarbonContent: producedWaterCalculated.averageHydrocarbonContent ?? waterAndProduced.producedWaterManagement?.averageHydrocarbonContent ?? null,
          freshwaterWithdrawalBySource: {
            surfaceWater: getNum(freshwaterCalculated.withdrawals?.surfaceWater?.volume),
            groundwater: getNum(freshwaterCalculated.withdrawals?.groundwater?.volume),
            municipalWater: getNum(freshwaterCalculated.withdrawals?.municipal?.volume),
          },
          hydraulicFracturingChemicalDisclosure: {
            wells: {
              totalFracturedWells: getNum(hydraulicFracturing.chemicalDisclosure?.totalNumberOfFracturedWells) || getNum(hydraulicFracturing.chemicalDisclosure?.totalFracturedWells) || getNum(hydraulicFracturing.waterQualityImpacts?.totalMonitoredSites),
              numberOfWellsWithPublicDisclosure: getNum(hydraulicFracturing.chemicalDisclosure?.numberOfWellsWithPublicDisclosure),
              percentageWithDisclosure: getNum(hydraulicFracturing.chemicalDisclosure?.percentageWellsWithDisclosure) ||
                (getNum(hydraulicFracturing.chemicalDisclosure?.numberOfWellsWithPublicDisclosure) && getNum(hydraulicFracturing.chemicalDisclosure?.totalNumberOfFracturedWells) ?
                  (getNum(hydraulicFracturing.chemicalDisclosure?.numberOfWellsWithPublicDisclosure) / getNum(hydraulicFracturing.chemicalDisclosure?.totalNumberOfFracturedWells) * 100) : 0),
            },
          },
          hydraulicFracturingWaterQualityImpacts: {
            sites: {
              totalFracturedSitesMonitored: getNum(hydraulicFracturing.waterQualityImpacts?.totalMonitoredSites),
              withDeterioratedWaterQuality: getNum(hydraulicFracturing.waterQualityImpacts?.sitesWithDeterioratedQuality),
              percentageWithDeterioratedWaterQuality: getNum(hydraulicFracturing.waterQualityImpacts?.percentageWithDeterioratedWaterQuality) || (hydraulicFracturing.waterQualityImpacts?.totalMonitoredSites && hydraulicFracturing.waterQualityImpacts?.sitesWithDeterioratedQuality ?
                (hydraulicFracturing.waterQualityImpacts.sitesWithDeterioratedQuality / hydraulicFracturing.waterQualityImpacts.totalMonitoredSites) * 100 : 0),
            }
          }
        },
        biodiversityImpact: {
          hydrocarbonSpills: {
            numberOfSpills: getNum(hydrocarbonSpillsCalculated.numberOfSpills) || getNum(hydrocarbonSpillsDirect.numberOfSpills),
            totalVolumeSpilled: getNum(hydrocarbonSpillsCalculated.totalVolumeSpilled?.volume) || getNum(hydrocarbonSpillsDirect.totalVolumeSpilled),
            volumeRecovered: getNum(hydrocarbonSpillsCalculated.volumeRecovered?.volume) || getNum(hydrocarbonSpillsDirect.volumeRecovered),
            volumeInArctic: getNum(hydrocarbonSpillsCalculated.volumeInArctic?.volume) || getNum(hydrocarbonSpillsDirect.volumeInArctic),
            volumeImpactingSensitiveShorelines: getNum(hydrocarbonSpillsCalculated.volumeImpactingSensitiveShorelines?.volume) || getNum(hydrocarbonSpillsDirect.volumeImpactingSensitiveShorelines) || getNum(hydrocarbonSpillsDirect.volumeImpactingShorelines),
          },
          reservesInSensitiveAreas: {
            totalProvedReserves: getNum(reservesCalculated.totalProvedReserves?.volume) || getNum(reservesDirect.totalProvedReservesVolume),
            provedReserves: getNum(reservesCalculated.provedReservesInSensitiveAreas?.volume) || getNum(reservesDirect.provedReservesSensitiveVolume),
            totalProbableReserves: getNum(reservesCalculated.totalProbableReserves?.volume) || getNum(reservesDirect.totalProbableReservesVolume),
            probableReserves: getNum(reservesCalculated.probableReservesInSensitiveAreas?.volume) || getNum(reservesDirect.probableReservesSensitiveVolume),
          }
        },
      },
      socialCapital: {
        operationalDelaysLevel: (() => {
          const total = getNum(com.operationalDelays?.numberOfDelaysCommunityProtests) + getNum(com.operationalDelays?.numberOfDelaysOtherStakeholder);
          return total === 0 ? "Low Risk" : total <= 3 ? "Medium Risk" : "High Risk";
        })(),
        desc: soc.desc || "",
        totalNumberOfIncidents: getNum(com.operationalDelays?.numberOfDelaysCommunityProtests) + getNum(com.operationalDelays?.numberOfDelaysOtherStakeholder),
        securityHumanRightsAndIndigenousPeople: {
          operationsInConflictZones: {
            totalProvedReserves: getNum((sec.reservesAreaConflict || sec.operationsInConflictZones)?.totalProvedReservesVolume),
            provedReserves: getNum((sec.reservesAreaConflict || sec.operationsInConflictZones)?.provedReservesInConflictVolume),
            totalProbableReserves: getNum((sec.reservesAreaConflict || sec.operationsInConflictZones)?.totalProbableReservesVolume),
            probableReserves: getNum((sec.reservesAreaConflict || sec.operationsInConflictZones)?.probableReservesInConflictVolume),
          },
          reservesInNearIndigenousLand: {
            totalProvedReserves: getNum((sec.reservesIndigenousLand || sec.reservesInNearIndigenousLand)?.totalProvedReservesVolume),
            provedReserves: getNum((sec.reservesIndigenousLand || sec.reservesInNearIndigenousLand)?.provedIndigenousVolume),
            totalProbableReserves: getNum((sec.reservesIndigenousLand || sec.reservesInNearIndigenousLand)?.totalProbableReservesVolume),
            probableReserves: getNum((sec.reservesIndigenousLand || sec.reservesInNearIndigenousLand)?.probableIndigenousVolume),
          }
        },
        communityRelations: {
          hcdtContribution: {
            priorYearOpexAmount: getNum(com.hcdtContribution?.opexAmount),
            annualContribution: getNum(com.hcdtContribution?.hcdtAmount),
            percentage: parseFloat(getPercentage(getNum(com.hcdtContribution?.hcdtAmount), getNum(com.hcdtContribution?.opexAmount)).toFixed(2)),
          },
          communityDisputeResolution: (() => {
            const d = com.communityDisputeResolution || com.disputeResolution || {};
            return {
              disputesReferred: getNum(d.disputesReferred),
              disputesResolved: getNum(d.disputesResolved),
            };
          })(),
          operationalDelays: {
            protests: {
              count: getNum(com.operationalDelays?.numberOfDelaysCommunityProtests),
              delay: getNum(com.operationalDelays?.durationDelaysCommunityProtests),
            },
            otherIssues: {
              count: getNum(com.operationalDelays?.numberOfDelaysOtherStakeholder),
              delay: getNum(com.operationalDelays?.durationDelaysOtherIssues),
            }
          }
        },
      },
      humanCapital: {
        // Fix #459: Aggregate direct/contract data
        direct: {
          recordableIncidents: getNum(humHealthSafety.direct?.recordableIncidents),
          fatalities: getNum(humHealthSafety.direct?.fatalities),
          nearMisses: getNum(humHealthSafety.direct?.nearMisses),
          totalHoursWorked: getNum(humHealthSafety.direct?.totalHoursWorked),
          trir:
            getNum(humHealthSafety.direct?.totalHoursWorked) > 0
              ? Number(
                (
                  (getNum(humHealthSafety.direct?.recordableIncidents) *
                    200000) /
                  getNum(humHealthSafety.direct?.totalHoursWorked)
                ).toFixed(2),
              )
              : 0,
        },
        contract: {
          recordableIncidents: getNum(humHealthSafety.contract?.recordableIncidents),
          fatalities: getNum(humHealthSafety.contract?.fatalities),
          nearMisses: getNum(humHealthSafety.contract?.nearMisses),
          totalHoursWorked: getNum(humHealthSafety.contract?.totalHoursWorked),
          trir:
            getNum(humHealthSafety.contract?.totalHoursWorked) > 0
              ? Number(
                (
                  (getNum(humHealthSafety.contract?.recordableIncidents) *
                    200000) /
                  getNum(humHealthSafety.contract?.totalHoursWorked)
                ).toFixed(2),
              )
              : 0,
        },
        // Fix #457: Calculate TRIR properly
        totalRecordableIncidentRatePer200kHours: (() => {
          const totalHours =
            (getNum(humHealthSafety.direct?.totalHoursWorked) ||
              getNum(humHealthSafety.totalHoursWorked)) +
            getNum(humHealthSafety.contract?.totalHoursWorked);
          const totalIncidents =
            (getNum(humHealthSafety.direct?.recordableIncidents) ||
              getNum(humHealthSafety.recordableIncidents)) +
            getNum(humHealthSafety.contract?.recordableIncidents);
          return totalHours > 0
            ? Number(((totalIncidents * 200000) / totalHours).toFixed(2))
            : 0;
        })(),
        desc:
          humWorkforce.riskAndOpportunityManagement?.safetyManagementSystems
            ?.safetyDescription || "",
        changePercentage: (() => {
          const prevHs =
            previousData?.humanCapital?.riskAndOpportunityManagement
              ?.healthAndSafetyPerformance;

          // Helper to calculate TRIR safely
          const calcTrir = (hs: any) => {
            if (!hs) return 0;
            const directHours = getNum(hs.direct?.totalHoursWorked);
            const flatHours = getNum(hs.totalHoursWorked);
            const contractHours = getNum(hs.contract?.totalHoursWorked);

            const directIncidents = getNum(hs.direct?.recordableIncidents);
            const flatIncidents = getNum(hs.recordableIncidents);
            const contractIncidents = getNum(hs.contract?.recordableIncidents);

            // Use direct if present, else fallback to flat (legacy), plus contract
            const totalHours = (directHours || flatHours) + contractHours;
            const totalIncidents = (directIncidents || flatIncidents) + contractIncidents;

            return totalHours > 0 ? (totalIncidents * 200000) / totalHours : 0;
          };

          const currTrir = calcTrir(humHealthSafety);
          const prevTrir = calcTrir(prevHs);

          return getChange(currTrir, prevTrir);
        })(),
        recordableIncidents:
          (getNum(humHealthSafety.direct?.recordableIncidents) || getNum(humHealthSafety.recordableIncidents)) +
          getNum(humHealthSafety.contract?.recordableIncidents),
        fatalities:
          (getNum(humHealthSafety.direct?.fatalities) || getNum(humHealthSafety.fatalities)) +
          getNum(humHealthSafety.contract?.fatalities),
        nearMisses:
          (getNum(humHealthSafety.direct?.nearMisses) || getNum(humHealthSafety.nearMisses)) +
          getNum(humHealthSafety.contract?.nearMisses),
        averageSafetyTrainingHoursPerEmployee: (() => {
          // Read from the nested direct/contract shape first; fall back to the
          // legacy flat field on healthAndSafetyPerformance so older assessments
          // (and any test data saved at the parent path) are not silently 0.
          const directTraining = getNum(humHealthSafety.direct?.safetyTrainingHours);
          const contractTraining = getNum(humHealthSafety.contract?.safetyTrainingHours);
          const flatTraining = getNum(humHealthSafety.safetyTrainingHours);
          if (directTraining > 0 && contractTraining > 0) {
            return Number(((directTraining + contractTraining) / 2).toFixed(2));
          }
          return Number((directTraining || contractTraining || flatTraining || 0).toFixed(2));
        })(),
        safetyManagementSystems: (() => {
          const sms = humWorkforce.riskAndOpportunityManagement?.safetyManagementSystems || {};
          return [{
            title: "Safety Management Systems",
            tag: sms.executiveRemunerationLinked === 'yes' ? "Executive Pay Linked to Safety" : "Safety Management",
            description: sms.safetyDescription || ""
          }];
        })(),
      },
      businessModel: {
        totalReservesAmountAtRisk: computedReservesAtRisk,
        desc: bus.desc || "",
        changePercentage: getChange(computedReservesAtRisk, getNum(previousData?.businessModel?.totalReservesAmountAtRisk)),
        reservesValuationAndCapitalExpenditure: {
          climateImpactOnReserves: {
            carbonPriceScenario: getNum(busClimateImpact.carbonPriceScenario),
            reservesAtRiskPercent: getNum(busClimateImpact.percentageDecrease),
            totalProvedReserves: getNum(busEmbedded.totalProvedReserves),
            totalProbableReserves: getNum(busClimateImpact.estimatedDecrease),
            embeddedCarbon: getNum(busEmbedded.estimatedEmbeddedEmissions),
          },
          strategicCapitalAllocation: {
            renewableInvestmentAmount: getNum(busRenewable.investmentAmount),
            renewableRevenueAmount: getNum(busRenewable.revenueAmount),
            gasProjectsValueCount: getNum(busCapex.capexPercentage),
            renewableProjectsValueCount: 0,
            maintenanceValueCount: Math.max(0, 100 - getNum(busCapex.capexPercentage)),
          },
        },
        businessEthicsAndTransparency: {
          geopoliticalAndCorruptionRisk: {
            proved: {
              total: getNum(busCorruptionRisk.totalProvedReserves),
              risk: getNum(busCorruptionRisk.provedReservesHighRisk),
            },
            probable: {
              total: getNum(busCorruptionRisk.totalProbableReserves),
              risk: getNum(busCorruptionRisk.probableReservesHighRisk),
            },
          },
          antiCorruptionManagement: busAntiCorruption.systemDescription || "",
        },
      },
      leadershipAndGovernance: {
        processSafetyPercentage: computedPSER,
        desc: lead.desc || "",
        numberOfTierEventsAndWhatTier: String(pseEvents) || "N/A",
        managementOfLegalAndRegulatoryEnvironment: {
          publicPolicyAndLobbying: legal.publicPolicyEngagement?.disclosesContributions || "",
          policyPosition: legal.publicPolicyEngagement?.policyPositions || "",
          sustainabilityGovernance: legal.boardAndManagementOversight?.oversightDiscussion || "",
          sustainabilityPosition: legal.boardAndManagementOversight?.oversightDiscussion || "",
          hasBoardCommittee: legal.boardAndManagementOversight?.hasBoardCommittee || "",
        },
        criticalIncidenceRiskManagement: {
          processSafetyEvents: {
            tierOneEvents: getNum(crit.processSafetyEvents?.numberOfEvents),
            totalHoursWorked: getNum(crit.processSafetyEvents?.totalHoursWorked),
            rate: computedPSER,
          },
          catastrophicEvents: {
            lastAssetIntegrityAudit: crit.catastrophicRiskManagementSystems?.auditDate || crit.catastrophicRiskManagementSystems?.lastAudit || "",
            description: crit.catastrophicRiskManagementSystems?.systemDescription || crit.catastrophicRiskManagementSystems?.description || "",
          },
        }
      },
      percentage_emission_summary: {
        scope1_emission_summary: scope1_percentage,
        scope2_emission_summary: scope2_percentage,
        scope3_emission_summary: scope3_percentage,
      },
      status: record.status,
      subsidiary: record.subsidiary,
      startMonth: record.startMonth,
      startYear: record.startYear,
      endMonth: record.endMonth,
      endYear: record.endYear,
      targets: targetPair,
      evidence: this.collectEvidenceByPillar(currentData),
      esgEvaluation: report ? {
        score: report.esgScore,
        grade: report.esgGrade,
        pillars: report.esgPillars,
      } : null,
    };
  }
}
