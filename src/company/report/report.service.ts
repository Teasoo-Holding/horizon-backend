import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  getPercentage,
  // extractFuelMixBreakdown,
  // getTop5ByFuelType,
  // sumScope1Values,
} from './entities/helpers';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);
  constructor(private prisma: PrismaService) { }

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
      const rawProgress = Number(data.overallProgress ?? r.report?.progress ?? 0);
      const progress = Math.min(Math.round(rawProgress), 100);
      const totalSections = Number(data.totalSections ?? r.report?.total_sections ?? 142);
      const completedSections = Math.round((progress / 100) * totalSections);
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

    const saved = await this.prisma.report.upsert({
      where: { assessmentId: id },
      update: result,
      create: { assessmentId: id, ...result },
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
      // Fix #458: Return null if previous data is missing
      if (!previous || previous === 0) return null;
      return Number((((current - previous) / previous) * 100).toFixed(1));
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

    // Activity Metrics
    const am = currentData.activityMetrics || {};
    const prod = am.productionVolume || am.productionData || {};
    const asset = am.assetPortfolio || {};
    const assetOffshore = asset.offshoreSites || {};
    const assetTerrestrial = asset.terrestrialSites || {};

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
            percentage: Math.min(100, Math.round(getPercentage(getNum(com.hcdtContribution?.hcdtAmount), getNum(com.hcdtContribution?.opexAmount)))),
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
          const directTraining = getNum(humHealthSafety.direct?.safetyTrainingHours);
          const contractTraining = getNum(humHealthSafety.contract?.safetyTrainingHours);
          if (directTraining > 0 && contractTraining > 0) return Number(((directTraining + contractTraining) / 2).toFixed(2));
          return Number((directTraining || contractTraining || 0).toFixed(2));
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
      targets: targets[0] || null,
    };
  }
}
