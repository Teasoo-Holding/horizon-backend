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

    // --- Environmental indicators ---
    const envScores: number[] = [];
    const envIndicators: { label: string; score: number }[] = [];

    const ghgTotalEmit = Number(totals?.ghg_total_emissions) || 0;
    const ghgIntensity = ghgTotalEmit / totalProdBoe;
    const ghgScore = this.interpolate(ghgIntensity, 0.010, 0.040);
    envScores.push(ghgScore);
    envIndicators.push({ label: 'GHG Intensity', score: ghgScore });

    const env = assessmentData?.environment || {};
    const flaredVol = Number(env.ghg?.scope1?.processEmissions?.gasFlaring?.volumeOfFlaredGas || env.ghg?.gasFlaringVolume || 0);
    const flareIntensity = flaredVol / totalProdBoe;
    const flareScore = this.interpolate(flareIntensity, 0.5, 5.0);
    envScores.push(flareScore);
    envIndicators.push({ label: 'Gas Flaring', score: flareScore });

    const ventedVol = Number(env.ghg?.scope1?.fugitiveEmissions?.ventingNaturalGas?.volume || 0);
    const ventIntensity = ventedVol / totalProdBoe;
    const ventScore = this.interpolate(ventIntensity, 0.05, 0.5);
    envScores.push(ventScore);
    envIndicators.push({ label: 'Venting & Fugitives', score: ventScore });

    const methaneScore = this.interpolate(0, 0, 1.5);
    envScores.push(methaneScore);
    envIndicators.push({ label: 'Methane Leakage', score: methaneScore });

    const scope3DataCount = Number(env.ghg?.scope3?.dataCount?.count) || 0;
    const scope3DisclosedRate = (scope3DataCount / 15) * 100;
    const scope3Score = this.interpolate(scope3DisclosedRate, 100, 0);
    envScores.push(scope3Score);
    envIndicators.push({ label: 'Scope 3 Disclosed Rate', score: scope3Score });

    const water = env.waterManagement?.waterAndProducedWaterManagement || {};
    const waterCalc = water.freshwaterWithdrawals?.calculated || {};
    const waterWithdrawn = (Number(waterCalc.withdrawals?.surfaceWater?.volume) || 0) +
                           (Number(waterCalc.withdrawals?.groundwater?.volume) || 0) +
                           (Number(waterCalc.withdrawals?.municipal?.volume) || 0);
    const waterIntensity = waterWithdrawn / totalProdBoe;
    const waterScore = this.interpolate(waterIntensity, 0.05, 0.3);
    envScores.push(waterScore);
    envIndicators.push({ label: 'Water Use Intensity', score: waterScore });

    const flowStations = Number(onAsset.flowStations) || 1;
    const waterPerStation = waterWithdrawn / flowStations;
    const waterStationScore = this.interpolate(waterPerStation, 0, 150000); // Approximate default
    envScores.push(waterStationScore);
    envIndicators.push({ label: 'Water Withdrawal per Flow Station', score: waterStationScore });

    const waterConsumed = Number(waterCalc.withdrawals?.totalConsumed?.volume) || 0;
    const waterConsIntensity = waterConsumed / totalProdBoe;
    const waterConsScore = this.interpolate(waterConsIntensity, 0, 0.05); // Approximate default
    envScores.push(waterConsScore);
    envIndicators.push({ label: 'Water Consumption Intensity', score: waterConsScore });

    const bio = env.biodiversityImpact?.environmentalManagement || {};
    const spill = bio.hydrocarbonSpills?.calculated || bio.hydrocarbonSpills || {};
    const spillVol = Number(spill.totalVolumeSpilled?.volume || spill.totalVolumeSpilled) || 0;
    const spillsBblPerMMBOE = (spillVol / totalProdBoe) * 1000000;
    const spillScore = this.interpolate(spillsBblPerMMBOE, 2.0, 50.0);
    envScores.push(spillScore);
    envIndicators.push({ label: 'Hydrocarbon Spills', score: spillScore });

    const numberOfSpills = Number(spill.numberOfSpills) || 0;
    const totalAssets = totalOffshoreAssets + totalOnshoreAssets;
    const spillFreq = numberOfSpills / totalAssets;
    const spillFreqScore = this.interpolate(spillFreq, 0, 1.0);
    envScores.push(spillFreqScore);
    envIndicators.push({ label: 'Spill Event Frequency', score: spillFreqScore });

    const sensitiveSpill = Number(spill.volumeImpactingSensitiveShorelines?.volume || spill.volumeImpactingShorelines) || 0;
    const sensitiveRatio = spillVol > 0 ? (sensitiveSpill / spillVol) * 100 : 0;
    const sensitiveScore = this.interpolate(sensitiveRatio, 0, 100);
    envScores.push(sensitiveScore);
    envIndicators.push({ label: 'Sensitive Shoreline Impact', score: sensitiveScore });

    // --- Social Capital + Human Capital indicators ---
    const socScores: number[] = [];
    const socIndicators: { label: string; score: number }[] = [];

    const sec = soc.securityRights || soc.securityHumanRights || {};
    const conflictRes = Number((sec.reservesAreaConflict || sec.operationsInConflictZones)?.totalProvedReservesVolume) || 0;
    const conflictRatio = conflictRes / totalProvedReserves;
    const conflictScore = this.interpolate(conflictRatio, 0.0, 0.25);
    socScores.push(conflictScore);
    socIndicators.push({ label: 'Operations in Conflict Zones', score: conflictScore });

    const indigRes = Number((sec.reservesIndigenousLand || sec.reservesInNearIndigenousLand)?.totalProvedReservesVolume) || 0;
    const indigRatio = indigRes / totalProvedReserves;
    const indigScore = this.interpolate(indigRatio, 0.0, 0.25);
    socScores.push(indigScore);
    socIndicators.push({ label: 'Indigenous Land Reserves', score: indigScore });

    const hcdtAmount = Number(com.hcdtContribution?.hcdtAmount) || 0;
    const hcdtRatio = hcdtAmount / priorYearOpex;
    const hcdtScore = hcdtRatio >= 0.03 ? 100 : 0;
    socScores.push(hcdtScore);
    socIndicators.push({ label: 'HCDT Contribution', score: hcdtScore });

    const dis = com.communityDisputeResolution || com.disputeResolution || {};
    const disRef = Number(dis.disputesReferred) || 1;
    const disRes = Number(dis.disputesResolved) || 0;
    const disputeScore = this.interpolate(disRes / disRef, 1.0, 0.0);
    socScores.push(disputeScore);
    socIndicators.push({ label: 'Dispute Resolution', score: disputeScore });

    const totalIncidents = (Number(humSafety.direct?.recordableIncidents) || 0) + (Number(humSafety.contract?.recordableIncidents) || 0);
    const trir = totalHoursWorked > 0 ? (totalIncidents * 200000) / totalHoursWorked : 0;
    const trirScore = this.interpolate(trir, 0.07, 0.30);
    socScores.push(trirScore);
    socIndicators.push({ label: 'Total Recordable Incident Rate (TRIR)', score: trirScore });

    const totalNearMisses = (Number(humSafety.direct?.nearMisses) || 0) + (Number(humSafety.contract?.nearMisses) || 0);
    const nmfr = totalHoursWorked > 0 ? (totalNearMisses * 200000) / totalHoursWorked : 0;
    const nmfrScore = this.interpolate(nmfr, 0.5, 2.5); 
    socScores.push(nmfrScore);
    socIndicators.push({ label: 'Near Miss Frequency Rate (NMFR)', score: nmfrScore });

    const totalDisruptionEvents = (Number(com.operationalDelays?.numberOfDelaysCommunityProtests) || 0) + 
                                  (Number(com.operationalDelays?.numberOfDelaysOtherStakeholder) || 0);
    const disruptionFreq = totalDisruptionEvents / totalAssets;
    const disruptionScore = this.interpolate(disruptionFreq, 0, 1.0);
    socScores.push(disruptionScore);
    socIndicators.push({ label: 'Disruption Event Frequency', score: disruptionScore });

    // --- Governance (Business Model + Leadership) indicators ---
    const govScores: number[] = [];
    const govIndicators: { label: string; score: number }[] = [];

    const lead = assessmentData?.leadershipGovernance || assessmentData?.environment?.leadershipGovernance || {};
    const crit = lead.criticalIncidentRiskManagement || {};
    const tier1 = Number(crit.processSafetyEvents?.numberOfEvents) || 0;
    const pseTotalHours = Number(crit.processSafetyEvents?.totalHoursWorked) || totalHoursWorked;
    const pser = pseTotalHours > 0 ? (tier1 * 200000) / pseTotalHours : 0;
    const pserScore = this.interpolate(pser, 0.01, 0.10);
    govScores.push(pserScore);
    govIndicators.push({ label: 'Process Safety Event Rate', score: pserScore });

    const capexStr = Number(busRes.capitalExpenditureStrategy?.transitionCapexPercentage) || 0;
    const capexScore = this.interpolate(capexStr, 0.50, 0.10);
    govScores.push(capexScore);
    govIndicators.push({ label: 'Transition CapEx Strategy', score: capexScore });

    const climateRiskRes = Number(busRes.reservesSensitivityToCarbonPricing?.estimatedDecrease) || Number(busRes.reservesSensitivityToCarbonPricing?.percentageDecrease) || 0;
    const climateRiskRatio = climateRiskRes > 100 ? climateRiskRes / totalProvedReserves : climateRiskRes / 100;
    const climateScore = this.interpolate(climateRiskRatio, 0.0, 0.25);
    govScores.push(climateScore);
    govIndicators.push({ label: 'Climate Risk on Reserves', score: climateScore });

    const embeddedCarbon = Number(busRes.embeddedCarbonInReserves?.estimatedEmbeddedEmissions) || 0;
    const embeddedIntensity = embeddedCarbon / totalProvedReserves;
    const embeddedScore = this.interpolate(embeddedIntensity, 0.25, 0.50);
    govScores.push(embeddedScore);
    govIndicators.push({ label: 'Embedded Carbon Intensity', score: embeddedScore });

    const safetyMgmt = hum.workforceHealthAndSafety?.riskAndOpportunityManagement?.safetyManagementSystems
      || hum.workforceHealthSafety?.riskAndOpportunityManagement?.safetyManagementSystems
      || hum.riskAndOpportunityManagement?.safetyManagementSystems
      || {};
      
    const safetyCert = safetyMgmt.iso45001Certified === 'yes' ? 100 : 0;
    govScores.push(safetyCert);
    govIndicators.push({ label: 'Safety Certification (ISO 45001)', score: safetyCert });

    const execCompLinked = safetyMgmt.executiveRemunerationLinked === 'yes' ? 100 : 0;
    govScores.push(execCompLinked);
    govIndicators.push({ label: 'Exec Comp ESG Linkage', score: execCompLinked });

    const carbonPriceScenario = Number(busRes.reservesSensitivityToCarbonPricing?.carbonPriceScenario) || 0;
    const carbonPriceScore = carbonPriceScenario >= 50 ? 100 : 0;
    govScores.push(carbonPriceScore);
    govIndicators.push({ label: 'Carbon Price Stress Test', score: carbonPriceScore });

    const legalOption = lead.managementOfTheLegalAndRegulatoryEnvironment || lead.legalRegulatoryEnvironment || {};
    const policyPositions = String(legalOption.publicPolicyEngagement?.policyPositions || "");
    const isAligned = /aligned|yes|climate change act/i.test(policyPositions) ? 100 : 0;
    govScores.push(isAligned);
    govIndicators.push({ label: 'Climate Policy Alignment', score: isAligned });

    const fatalities = (Number(humSafety.direct?.fatalities) || 0) + (Number(humSafety.contract?.fatalities) || 0);
    const protestDays = Number(com.operationalDelays?.durationDelaysCommunityProtests) || 0;
    const otherDelays = Number(com.operationalDelays?.durationDelaysOtherIssues) || 0;
    const totalDaysLost = protestDays + otherDelays;

    const result = this.gradingService.aggregate(
      envScores,
      socScores,
      govScores,
      {
        majorSpills: spillVol > 250 ? 1 : 0,
        fatalities: fatalities,
        protestDays: totalDaysLost,
        processSafetyEvents: tier1,
        hcdtDefiance: hcdtAmount === 0,
        totalNearMisses,
        totalDisruptionEvents,
      }
    );

    // Attach per-indicator breakdowns to each pillar
    result.pillars.environmental.indicators = envIndicators;
    result.pillars.socialCapital.indicators = [
      ...socIndicators.slice(0, 4), // Conflict, Indigenous, HCDT, Dispute
      socIndicators[6] // Disruption Event Frequency
    ];
    result.pillars.humanCapital.indicators = [
      socIndicators[4], // TRIR
      socIndicators[5]  // NMFR
    ];
    result.pillars.businessModel.indicators = govIndicators.slice(1, 4); // CapEx, Climate, Embedded
    result.pillars.leadership.indicators = [
      govIndicators[0], // PSER
      govIndicators[4], // ISO cert
      govIndicators[5], // Exec Comp ESG Linkage
      govIndicators[6], // Carbon Price Stress Test
      govIndicators[7]  // Climate Policy Alignment
    ];

    return result;
  }
}
