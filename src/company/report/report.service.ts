import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  getPercentage,
  // extractFuelMixBreakdown,
  // getTop5ByFuelType,
  // sumScope1Values,
} from './entities/helpers';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaClient) { }

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
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });
    return report.map(r => {
      const data = (r.assessmentData || {}) as any;
      return {
        ...r,
        progress: data.overallProgress ?? r.report?.progress ?? 0,
        report: undefined, // Clean up
        assessmentData: undefined // Clean up
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
      social_datacount_scope_one: 0,
      social_datacount_scope_two: 0,
      social_datacount_scope_three: 0,
      governance_total_emissions: 0,
      governance_scope_one: 0,
      governance_scope_two: 0,
      governance_scope_three: 0,
      governance_datacount_scope_one: 0,
      governance_datacount_scope_two: 0,
      governance_datacount_scope_three: 0,
    };

    console.log(`Upserting report for assessment ${id}`, result);

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
    const ghg = env.ghg || {};
    const air = env.airQuality?.airPollutantEmissions || {};
    const water = env.waterManagement || {};
    const waterAndProduced = water.waterAndProducedWaterManagement || {};
    const bio = env.biodiversityImpact?.environmentalManagement || {};

    // Activity Metrics
    const am = currentData.activityMetrics || {};
    const prod = am.productionData || {};
    const asset = am.assetPortfolio || {};
    const assetOffshore = asset.offshoreSites || {};
    const assetTerrestrial = asset.terrestrialSites || {};

    // Social Capital
    const soc = currentData.socialCapital || {};
    const sec = soc.securityHumanRights || {};
    const com = soc.communityRelations || {};
    const opDelays = com.operationalDelays || {};

    // Human Capital
    const hum = currentData.humanCapital || {};

    // Business Model
    const bus = currentData.businessModel || {};
    const busReserves = bus.reservesValuation || {};
    const busEthics = bus.businessEthics || {};

    // Leadership & Governance
    const lead = currentData.leadershipGovernance || {};
    const crit = lead.criticalIncidenceRiskManagement || {};

    // Scope Percentages
    const totalEmissions = report?.ghg_total_emissions ?? getNum(currentData.totalEmission);
    const scope1 = report?.ghg_scope_one ?? getNum(env.ghg?.scope1?.totalEmission);
    const scope2 = report?.ghg_scope_two ?? getNum(env.ghg?.scope2?.totalEmission);
    const scope3 = report?.ghg_scope_three ?? getNum(env.ghg?.scope3?.totalEmission);

    const scope1_percentage = getPercentage(scope1, totalEmissions);
    const scope2_percentage = getPercentage(scope2, totalEmissions);
    const scope3_percentage = getPercentage(scope3, totalEmissions);

    return {
      activityMetrics: {
        productionData: {
          oilProduction: {
            crudeOil: getNum(prod.oilProduction?.crudeOil),
            syntheticOil: getNum(prod.oilProduction?.syntheticOil),
          },
          gasProduction: {
            naturalGas: getNum(prod.gasProduction?.naturalGas),
            syntheticGas: getNum(prod.gasProduction?.syntheticGas),
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
          totalEmission: (getNum(air.nox) + getNum(air.sox) + getNum(air.voc) + getNum(air.pm)),
          nox: getNum(air.nox),
          sox: getNum(air.sox),
          voc: getNum(air.voc),
          pm10: getNum(air.pm),
        },
        waterManagement: {
          totalWaterWithdrawal: getNum(waterAndProduced.freshwaterWithdrawals?.totalWithdrawal),
          totalWaterConsumed: getNum(waterAndProduced.freshwaterWithdrawals?.totalWaterConsumed),
          totalProducedWaterGenerated: getNum(waterAndProduced.producedWaterManagement?.totalProducedWaterGenerated),
          recycledWater: getNum(waterAndProduced.producedWaterManagement?.volumeRecycledReused),
          injectedForDisposal: getNum(waterAndProduced.producedWaterManagement?.volumeInjectedForDisposal),
          dischargedToSurface: getNum(waterAndProduced.producedWaterManagement?.volumeDischargedToSurface),
          freshwaterWithdrawalBySource: {
            surfaceWater: getNum(waterAndProduced.freshwaterWithdrawals?.withdrawalfromSurfaceWater),
            groundwater: getNum(waterAndProduced.freshwaterWithdrawals?.withdrawalfromGroundwater),
            municipalWater: getNum(waterAndProduced.freshwaterWithdrawals?.withdrawalfromMunicipalotherOtherSources),
          },
          hydraulicFracturingChemicalDisclosure: {
            wells: {
              totalFracturedWells: getNum(water.hydraulicFracturingImpacts?.waterQualityImpacts?.totalNumberOfWells),
              numberOfWellsWithPublicDisclosure: getNum(water.hydraulicFracturingImpacts?.waterQualityImpacts?.numberOfWellsWithPublicDisclosure),
              percentageWithDisclosure: getNum(water.hydraulicFracturingImpacts?.waterQualityImpacts?.percentageWellsWithDisclosure), // Logic might be needed if not pre-calculated
            },
          },
          hydraulicFracturingWaterQualityImpacts: {
            sites: {
              totalFracturedSitesMonitored: getNum(water.hydraulicFracturingImpacts?.waterQualityImpacts?.totalNumberOfSites),
              withDeterioratedWaterQuality: getNum(water.hydraulicFracturingImpacts?.waterQualityImpacts?.numberOfSitesWithDeterioratedWaterQuality),
              percentageWithDeterioratedWaterQuality: 0, // Calculate if needed: (deteriorated / total) * 100
            }
          }
        },
        biodiversityImpact: {
          hydrocarbonSpills: {
            numberOfSpills: getNum(bio.hydrocarbonSpills?.numberOfSpills),
            totalVolumeSpilled: getNum(bio.hydrocarbonSpills?.totalVolumeSpilled),
            volumeRecovered: getNum(bio.hydrocarbonSpills?.volumeRecovered),
          },
          reservesInSensitiveAreas: {
            provedReserves: getNum(bio.reservesInSensitiveAreas?.totalProvedReservesVolume),
            probableReserves: getNum(bio.reservesInSensitiveAreas?.totalProbableReservesVolume),
          }
        },
      },
      socialCapital: {
        operationalDelaysLevel: soc.operationalDelaysLevel || "Low Risk",
        desc: soc.desc || "",
        totalNumberOfIncidents: getNum(soc.totalNumberOfIncidents),
        securityHumanRightsAndIndigenousPeople: {
          operationsInConflictZones: {
            provedReserves: getNum(sec.operationsInConflictZones?.provedReserves),
            probableReserves: getNum(sec.operationsInConflictZones?.probableReserves),
          },
          reservesInNearIndigenousLand: {
            provedReserves: getNum(sec.reservesInNearIndigenousLand?.provedReserves),
            probableReserves: getNum(sec.reservesInNearIndigenousLand?.probableReserves),
          }
        },
        communityRelations: {
          hcdtContribution: {
            priorYearOpexAmount: getNum(com.hcdtContribution?.priorYearOPEX),
            annualContribution: getNum(com.hcdtContribution?.annualContribution),
            percentage: getNum(com.hcdtContribution?.percentage),
          },
          communityDisputeResolution: {
            resolvedDisputes: getNum(com.communityDisputeResolution?.resolvedDisputes),
            pending: getNum(com.communityDisputeResolution?.pending),
            total: getNum(com.communityDisputeResolution?.total),
          },
          operationalDelays: {
            protests: {
              count: getNum(opDelays.protests?.count),
              delay: getNum(opDelays.protests?.delay),
            },
            otherIssues: {
              count: getNum(opDelays.otherIssues?.count),
              delay: getNum(opDelays.otherIssues?.delay),
            }
          }
        },
      },
      humanCapital: {
        totalRecordableIncidentRatePer200kHours: getNum(hum.totalRecordableIncidentRate),
        desc: hum.desc || "",
        changePercentage: getChange(getNum(hum.totalRecordableIncidentRate), getNum(previousData?.humanCapital?.totalRecordableIncidentRate)),
        recordableIncidents: getNum(hum.recordableIncidents),
        fatalities: getNum(hum.fatalities),
        nearMisses: getNum(hum.nearMisses),
        averageSafetyTrainingHoursPerEmployee: getNum(hum.averageSafetyTrainingHours),
      },
      businessModel: {
        totalReservesAmountAtRisk: getNum(bus.totalReservesAmountAtRisk),
        desc: bus.desc || "",
        changePercentage: getChange(getNum(bus.totalReservesAmountAtRisk), getNum(previousData?.businessModel?.totalReservesAmountAtRisk)),
        reservesValuationAndCapitalExpenditure: {
          climateImpactOnReserves: {
            carbonPriceScenario: busReserves.climateImpact?.carbonPriceScenario || "",
            reservesAtRiskPercent: getNum(busReserves.climateImpact?.reservesAtRiskPercent),
            totalProvedReserves: getNum(busReserves.climateImpact?.totalProvedReserves),
            embeddedCarbon: getNum(busReserves.climateImpact?.embeddedCarbon),
          },
          strategicCapitalAllocation: {
            renewableInvestmentAmount: getNum(busReserves.strategicCapitalAllocation?.renewableInvestmentAmount),
            renewableRevenueAmount: getNum(busReserves.strategicCapitalAllocation?.renewableRevenueAmount),
            gasProjectsValueCount: getNum(busReserves.strategicCapitalAllocation?.gasProjectsValueCount),
            maintenanceValueCount: getNum(busReserves.strategicCapitalAllocation?.maintenanceValueCount),
            renewableProjectsValueCount: getNum(busReserves.strategicCapitalAllocation?.renewableProjectsValueCount),
          },
        },
        businessEthicsAndTransparency: {
          geopoliticalAndCorruptionRisk: {
            proved: {
              total: getNum(busEthics.geopoliticalRisk?.proved?.total),
              risk: getNum(busEthics.geopoliticalRisk?.proved?.risk),
            },
            probable: {
              total: getNum(busEthics.geopoliticalRisk?.probable?.total),
              risk: getNum(busEthics.geopoliticalRisk?.probable?.risk),
            },
          },
          antiCorruptionManagement: busEthics.antiCorruptionManagement || "",
        },
      },
      leadershipAndGovernance: {
        processSafetyPercentage: getNum(lead.processSafetyPercentage),
        desc: lead.desc || "",
        numberOfTierEventsAndWhatTier: lead.numberOfTierEvents || "",
        managementOfLegalAndRegulatoryEnvironment: {
          publicPolicyAndLobbying: lead.managementLegal?.publicPolicy || "",
          policyPosition: lead.managementLegal?.policyPosition || "",
          sustainabilityGovernance: lead.managementLegal?.sustainabilityGovernance || "",
          sustainabilityPosition: lead.managementLegal?.sustainabilityPosition || "",
        },
        criticalIncidenceRiskManagement: {
          processSafetyEvents: {
            tierOneEvents: getNum(crit.processSafetyEvents?.tierOneEvents),
            totalHoursWorked: getNum(crit.processSafetyEvents?.totalHoursWorked),
            rate: getNum(crit.processSafetyEvents?.rate),
          },
          catastrophicEvents: {
            lastAssetIntegrityAudit: crit.catastrophicEvents?.lastAudit || "",
            description: crit.catastrophicEvents?.description || "",
          },
        }
      },
      targets: targets[0] || null,
    };
  }
}
