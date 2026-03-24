import { Injectable } from '@nestjs/common';
import { GradingService } from './grading.service';

@Injectable()
export class ScoringService {
  constructor(private gradingService: GradingService) {}

  private interpolate(value: number, target: number, worst: number): number {
    if (worst === target) return value === target ? 100 : 0;
    const score = 100 * (worst - value) / (worst - target);
    return Math.max(0, Math.min(100, score));
  }

  public calculateESGScore(assessmentData: any, totals: any) {
    const am = assessmentData?.activityMetrics || {};
    const prod = am.productionVolume || am.productionData || {};
    const asset = am.assetPortfolio || {};

    const rawOilKbpd = Number(prod.crudeOilProductionVolume || prod.oilProduction?.crudeOil) || 0;
    const rawGasMmscfd = Number(prod.naturalGasProductionVolume || prod.gasProduction?.naturalGas) || 0;

    const oilProdAnnual = rawOilKbpd * 1000 * 365;
    const gasBoeDaily = (rawGasMmscfd * 1000000) / 6000;
    const gasProdAnnual = gasBoeDaily * 365;
    const totalProdBoe = (oilProdAnnual + gasProdAnnual) || 1; 

    const hum = assessmentData?.humanCapital || {};
    const humSafety = hum.riskAndOpportunityManagement?.healthAndSafetyPerformance || {};
    const totalHoursWorked = (Number(humSafety.direct?.totalHoursWorked) || 0) + (Number(humSafety.contract?.totalHoursWorked) || 0) || 1;

    const soc = assessmentData?.socialCapital || {};
    const com = soc.communityRelations || {};
    const priorYearOpex = Number(com.hcdtContribution?.opexAmount) || 1;

    const bus = assessmentData?.businessInnovation || {};
    const busRes = bus.reservesValuationAndCapitalExpenditures || {};
    const totalProvedReserves = Number(busRes.embeddedCarbonInReserves?.totalProvedReserves) || 1;

    const offAsset = asset.offshoreSites || {};
    const onAsset = asset.terrestrialSites || {};
    const totalOffshoreAssets = Number(offAsset.totalNumber) || 1;
    const totalOnshoreAssets = Number(onAsset.totalNumber) || 1;

    const envScores: number[] = [];

    const ghgTotalEmit = Number(totals?.ghg_total_emissions) || 0;
    const ghgIntensity = ghgTotalEmit / totalProdBoe;
    envScores.push(this.interpolate(ghgIntensity, 0.010, 0.040));

    const env = assessmentData?.environment || {};
    const flaredVol = Number(env.ghg?.scope1?.processEmissions?.gasFlaring?.volumeOfFlaredGas || env.ghg?.gasFlaringVolume || 0);
    const flareIntensity = flaredVol / totalProdBoe;
    envScores.push(this.interpolate(flareIntensity, 0.5, 5.0));

    const ventedVol = Number(env.ghg?.scope1?.fugitiveEmissions?.ventingNaturalGas?.volume || 0);
    const ventIntensity = ventedVol / totalProdBoe;
    envScores.push(this.interpolate(ventIntensity, 0.05, 0.5));

    envScores.push(this.interpolate(0, 0, 1.5)); 

    const water = env.waterManagement?.waterAndProducedWaterManagement || {};
    const waterCalc = water.freshwaterWithdrawals?.calculated || {};
    const waterWithdrawn = (Number(waterCalc.withdrawals?.surfaceWater?.volume) || 0) + 
                           (Number(waterCalc.withdrawals?.groundwater?.volume) || 0) + 
                           (Number(waterCalc.withdrawals?.municipal?.volume) || 0);
    const waterIntensity = waterWithdrawn / totalProdBoe;
    envScores.push(this.interpolate(waterIntensity, 0.05, 0.3));

    const bio = env.biodiversityImpact?.environmentalManagement || {};
    const spill = bio.hydrocarbonSpills?.calculated || bio.hydrocarbonSpills || {};
    const spillVol = Number(spill.totalVolumeSpilled?.volume || spill.totalVolumeSpilled) || 0;
    const spillsBblPerMMBOE = (spillVol / totalProdBoe) * 1000000;
    envScores.push(this.interpolate(spillsBblPerMMBOE, 2.0, 50.0));

    const socScores: number[] = [];
    const sec = soc.securityRights || soc.securityHumanRights || {};
    const conflictRes = Number((sec.reservesAreaConflict || sec.operationsInConflictZones)?.totalProvedReservesVolume) || 0;
    const conflictRatio = conflictRes / totalProvedReserves;
    socScores.push(this.interpolate(conflictRatio, 0.0, 0.25));

    const indigRes = Number((sec.reservesIndigenousLand || sec.reservesInNearIndigenousLand)?.totalProvedReservesVolume) || 0;
    const indigRatio = indigRes / totalProvedReserves;
    socScores.push(this.interpolate(indigRatio, 0.0, 0.25));

    const hcdtAmount = Number(com.hcdtContribution?.hcdtAmount) || 0;
    const hcdtRatio = hcdtAmount / priorYearOpex;
    socScores.push(hcdtRatio >= 0.03 ? 100 : 0);

    const dis = com.communityDisputeResolution || com.disputeResolution || {};
    const disRef = Number(dis.disputesReferred) || 1;
    const disRes = Number(dis.disputesResolved) || 0;
    socScores.push(this.interpolate(disRes / disRef, 1.0, 0.0));

    const totalIncidents = (Number(humSafety.direct?.recordableIncidents) || 0) + (Number(humSafety.contract?.recordableIncidents) || 0);
    const trir = totalHoursWorked > 0 ? (totalIncidents * 200000) / totalHoursWorked : 0;
    socScores.push(this.interpolate(trir, 0.07, 0.30));

    const govScores: number[] = [];
    const lead = assessmentData?.leadershipGovernance || assessmentData?.environment?.leadershipGovernance || {};
    const crit = lead.criticalIncidentRiskManagement || {};
    const tier1 = Number(crit.processSafetyEvents?.numberOfEvents) || 0;
    const pseTotalHours = Number(crit.processSafetyEvents?.totalHoursWorked) || totalHoursWorked;
    const pser = pseTotalHours > 0 ? (tier1 * 200000) / pseTotalHours : 0;
    govScores.push(this.interpolate(pser, 0.01, 0.10));

    const capexStr = Number(busRes.capitalExpenditureStrategy?.transitionCapexPercentage) || 0;
    govScores.push(this.interpolate(capexStr, 0.50, 0.10));

    const climateRiskRes = Number(busRes.reservesSensitivityToCarbonPricing?.estimatedDecrease) || Number(busRes.reservesSensitivityToCarbonPricing?.percentageDecrease) || 0;
    const climateRiskRatio = climateRiskRes > 100 ? climateRiskRes / totalProvedReserves : climateRiskRes / 100;
    govScores.push(this.interpolate(climateRiskRatio, 0.0, 0.25));

    const embeddedCarbon = Number(busRes.embeddedCarbonInReserves?.estimatedEmbeddedEmissions) || 0;
    const embeddedIntensity = embeddedCarbon / totalProvedReserves;
    govScores.push(this.interpolate(embeddedIntensity, 0.25, 0.50));

    const safetyCert = hum.riskAndOpportunityManagement?.safetyManagementSystems?.iso45001Certified === 'yes' ? 100 : 0;
    govScores.push(safetyCert);

    const fatalities = (Number(humSafety.direct?.fatalities) || 0) + (Number(humSafety.contract?.fatalities) || 0);
    const protestDaysLevel = Number(com.operationalDelays?.durationDelaysCommunityProtests) || 0;

    return this.gradingService.aggregate(
      envScores,
      socScores,
      govScores,
      {
        majorSpills: spillVol > 250 ? 1 : 0, 
        fatalities: fatalities,
        protestDays: protestDaysLevel,
        processSafetyEvents: tier1,
        hcdtDefiance: hcdtAmount === 0,
      }
    );
  }
}
