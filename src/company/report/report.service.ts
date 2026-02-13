import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  getPercentage,
  // extractFuelMixBreakdown,
  // getTop5ByFuelType,
  // sumScope1Values,
} from './entities/helpers';

@Injectable()
export class ReportService {
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
      return {
        ...r,
        progress: data.overallProgress ?? r.report?.progress ?? 0,
        completed_sections: data.completedSections ?? r.report?.completed_sections ?? 0,
        total_sections: data.totalSections ?? r.report?.total_sections ?? 100,
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

    const report = sumSummary?.assessmentData as any;
    const ghg = report?.environment?.ghg;
    const socialCapital = report?.socialCapital || {};
    const humanCapital = report?.humanCapital || {};
    const businessModel = report?.businessModelAndInnovation || report?.businessModel || {};
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
      environmental_datacount_scope_two: 0,
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
      business_datacount_scope_one: Object.keys(businessModel.reserveValuation || {}).length + Object.keys(businessModel.businessEthicsAndTransparency || {}).length,
      business_datacount_scope_two: 0,
      business_datacount_scope_three: 0,
      // Leadership & Governance metrics
      leadership_total_emissions: 0,
      leadership_scope_one: 0,
      leadership_scope_two: 0,
      leadership_scope_three: 0,
      leadership_datacount_scope_one: Object.keys(leadershipGovernance.criticalIncidentRiskManagement || {}).length + Object.keys(leadershipGovernance.managementOfLegalAndRegulatoryEnvironment || {}).length,
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

    console.log(`Report saved: ${saved.id}`);

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
      where: { id },
    });

    if (!record || !record.assessmentData) {
      return {}; // Return empty object if no data
    }

    // Fetch previous assessment for change percentage calculations
    const previousRecord = await this.prisma.assessment.findFirst({
      where: {
        companyId,
        createdAt: { lt: record.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    const currentData = (typeof record.assessmentData === 'string'
      ? JSON.parse(record.assessmentData)
      : record.assessmentData) as any;

    const previousData = previousRecord?.assessmentData
      ? (typeof previousRecord.assessmentData === 'string'
        ? JSON.parse(previousRecord.assessmentData)
        : previousRecord.assessmentData) as any
      : null;

    // Helper for change percentage
    const getChange = (current: number, previous: number) => {
      if (!previous || previous === 0) return 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    // Helper for safe number access
    const getNum = (val: any) => (val && !isNaN(Number(val)) ? Number(val) : 0);

    // Fetch trend data
    const trendData = await this.prisma.assessment.findMany({
      where: { companyId },
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
      return data.map(t => ({
        score: t.report?.[key] ?? 0,
        period: `${t.startMonth} ${t.startYear} - ${t.endMonth} ${t.endYear}`
      })).reverse();
    };

    const targets = await this.prisma.target.findMany({
      where: { companyId },
      include: { scopeTargets: true, generalTarget: true }
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

    // Business Model
    const bus = currentData.businessModelAndInnovation || currentData.businessModel || {};
    const busReserves = bus.reserveValuation || bus.reservesValuation || {};
    const busClimateImpact = busReserves.climateImpact || {};
    const busStrategic = busReserves.strategicCapitalAllocation || {};
    const busEthics = bus.businessEthicsAndTransparency || bus.businessEthics || {};

    // Leadership & Governance
    const lead = currentData.leadershipGovernance || {};
    const crit = lead.criticalIncidentRiskManagement || {};
    const legal = lead.managementOfLegalAndRegulatoryEnvironment || {};

    // Scope Totals (Prefer calculated data from assessmentData if available)
    const scope1_live = getNum(env.ghg?.scope1?.totalEmission);
    const scope2_live = getNum(env.ghg?.scope2?.totalEmission);
    const scope3_live = getNum(env.ghg?.scope3?.totalEmission);

    const scope1 = scope1_live || report?.ghg_scope_one || 0;
    const scope2 = scope2_live || report?.ghg_scope_two || 0;
    const scope3 = scope3_live || report?.ghg_scope_three || 0;
    const totalEmissions = (scope1 + scope2 + scope3) || report?.ghg_total_emissions || getNum(currentData.totalEmission);

    const scope1_percentage = getPercentage(scope1, totalEmissions);
    const scope2_percentage = getPercentage(scope2, totalEmissions);
    const scope3_percentage = getPercentage(scope3, totalEmissions);

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
        changePercentage: getChange(totalEmissions, getNum(prevEnv.totalEmission)),
        greenhouseGasEmission: {
          totalEmissions: totalEmissions,
          totalHistory: formatHistory(trendData, 'ghg_total_emissions'),
          scope1Emissions: scope1,
          scope1History: formatHistory(trendData, 'ghg_scope_one'),
          scope2Emissions: scope2,
          scope2History: formatHistory(trendData, 'ghg_scope_two'),
          scope3Emissions: scope3,
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
          totalProducedWaterGenerated: getNum(producedWaterCalculated.totalProducedWater?.volume) || getNum(freshwaterCalculated.producedWater?.generated?.volume),
          recycledWater: getNum(producedWaterCalculated.recycledReused?.volume) || getNum(freshwaterCalculated.producedWater?.recycled?.volume),
          injectedForDisposal: getNum(producedWaterCalculated.injectedForDisposal?.volume) || getNum(freshwaterCalculated.producedWater?.injected?.volume),
          dischargedToSurface: getNum(producedWaterCalculated.dischargedToSurface?.volume) || getNum(freshwaterCalculated.producedWater?.discharged?.volume),
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
            provedReserves: getNum(reservesCalculated.provedReservesInSensitiveAreas?.volume) || getNum(reservesDirect.provedReservesSensitiveVolume),
            probableReserves: getNum(reservesCalculated.probableReservesInSensitiveAreas?.volume) || getNum(reservesDirect.probableReservesSensitiveVolume),
          }
        },
      },
      socialCapital: {
        operationalDelaysLevel: soc.operationalDelaysLevel || "Low Risk",
        desc: soc.desc || "",
        totalNumberOfIncidents: getNum(soc.totalNumberOfIncidents),
        securityHumanRightsAndIndigenousPeople: {
          operationsInConflictZones: {
            provedReserves: getNum(sec.reservesAreaConflict?.totalProvedReservesVolume),
            probableReserves: getNum(sec.reservesAreaConflict?.probableReservesInConflictVolume),
          },
          reservesInNearIndigenousLand: {
            provedReserves: getNum(sec.reservesIndigenousLand?.totalProvedReservesVolume),
            probableReserves: getNum(sec.reservesIndigenousLand?.probableIndigenousVolume),
          }
        },
        communityRelations: {
          hcdtContribution: {
            priorYearOpexAmount: getNum(com.hcdtContribution?.opexAmount),
            annualContribution: getNum(com.hcdtContribution?.hcdtAmount),
            percentage: getNum(com.hcdtContribution?.percentage),
          },
          communityDisputeResolution: {
            resolvedDisputes: getNum(com.disputeResolution?.disputesResolved),
            pending: getNum(com.disputeResolution?.disputesReferred),
            total: getNum(com.disputeResolution?.disputesResolved) + getNum(com.disputeResolution?.disputesReferred),
          },
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
        totalRecordableIncidentRatePer200kHours: getNum(humHealthSafety.recordableIncidents),
        desc: humWorkforce.riskAndOpportunityManagement?.safetyManagementSystems?.safetyDescription || "",
        changePercentage: getChange(getNum(humHealthSafety.recordableIncidents), getNum(previousData?.humanCapital?.riskAndOpportunityManagement?.healthAndSafetyPerformance?.recordableIncidents)),
        recordableIncidents: getNum(humHealthSafety.recordableIncidents),
        fatalities: getNum(humHealthSafety.fatalities),
        nearMisses: getNum(humHealthSafety.nearMisses),
        averageSafetyTrainingHoursPerEmployee: getNum(humHealthSafety.safetyTrainingHours),
      },
      businessModel: {
        totalReservesAmountAtRisk: getNum(bus.totalReservesAmountAtRisk),
        desc: bus.desc || "",
        changePercentage: getChange(getNum(bus.totalReservesAmountAtRisk), getNum(previousData?.businessModel?.totalReservesAmountAtRisk)),
        reservesValuationAndCapitalExpenditure: {
          climateImpactOnReserves: {
            carbonPriceScenario: getNum(busClimateImpact.reserveSensitivity?.carbonPriceScenario),
            reservesAtRiskPercent: getNum(busClimateImpact.reserveSensitivity?.percentageDecrease),
            totalProvedReserves: getNum(busClimateImpact.reserveSensitivity?.estimatedDecrease),
            totalProbableReserves: 0,
            embeddedCarbon: getNum(busClimateImpact.embeddedCarbonInReserve?.estimatedEmbeddedEmissions),
          },
          strategicCapitalAllocation: {
            renewableInvestmentAmount: getNum(busStrategic.renewableEnergyInvestment?.investmentAmount),
            renewableRevenueAmount: getNum(busStrategic.renewableEnergyInvestment?.revenueAmount),
            gasProjectsValueCount: getNum(busStrategic.capitalExpenditureStrategy?.capexPercentage),
            maintenanceValueCount: 0, // Not mapped in data
            renewableProjectsValueCount: 0, // Not mapped in data
          },
        },
        businessEthicsAndTransparency: {
          geopoliticalAndCorruptionRisk: {
            proved: {
              total: getNum(busEthics.reservesCountriesCorruptionRisk?.totalProvedReservesUnit),
              risk: getNum(busEthics.reservesCountriesCorruptionRisk?.provedReservesInConflictVolume),
            },
            probable: {
              total: getNum(busEthics.reservesCountriesCorruptionRisk?.totalProbableReservesUnit),
              risk: getNum(busEthics.reservesCountriesCorruptionRisk?.probableReservesInConflictUnit),
            },
          },
          antiCorruptionManagement: busEthics.antiCorruptionManagement?.discussion || "",
        },
      },
      leadershipAndGovernance: {
        processSafetyPercentage: 0,
        desc: lead.desc || "",
        numberOfTierEventsAndWhatTier: crit.processSafetyEvents?.tierOneEvents || "",
        managementOfLegalAndRegulatoryEnvironment: {
          publicPolicyAndLobbying: legal.publicPolicyEngagement?.discussion || "",
          policyPosition: legal.publicPolicyEngagement?.position || "",
          sustainabilityGovernance: legal.boardManagementOversight?.discussion || "",
          sustainabilityPosition: legal.boardManagementOversight?.position || "",
        },
        criticalIncidenceRiskManagement: {
          processSafetyEvents: {
            tierOneEvents: getNum(crit.processSafetyEvents?.tierOneEvents),
            totalHoursWorked: getNum(crit.processSafetyEvents?.totalHoursWorked),
            rate: getNum(crit.processSafetyEvents?.recordableIncidents),
          },
          catastrophicEvents: {
            lastAssetIntegrityAudit: crit.catastrophicRiskManagementSystems?.lastAudit || "",
            description: crit.catastrophicRiskManagementSystems?.description || "",
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
