import { Injectable } from '@nestjs/common';
import {
  Scope1ComputationService,
  Scope2Computation,
  Scope3ComputationService,
} from 'src/assessment/computation/computation.service';
import { AirQualityComputationService } from 'src/assessment/computation/air-quality.service';
import { WaterComputationService } from 'src/assessment/computation/water.service';
import { BiodiversityComputationService } from 'src/assessment/computation/biodiversity.service';
import { ActivityMetricsComputationService } from 'src/assessment/computation/activity-metrics.service';

interface AssessmentData {
  environment?: any;
  foundationalData?: any;
  overallProgress?: number;
  totalEmission?: number;
  topEmissionSources?: Array<{
    scope: string;
    group: string;
    source: string;
    emission: number;
    percentage: number;
  }>;
  lastSavedForm?: string;
  submittedGroups?: string[];
  completedSections?: number;
  totalSections?: number;
}

@Injectable()
export class AssessmentCalculatorService {
  constructor(
    private scope1: Scope1ComputationService,
    private scope2: Scope2Computation,
    private scope3: Scope3ComputationService,
    private airQuality: AirQualityComputationService,
    private water: WaterComputationService,
    private biodiversity: BiodiversityComputationService,
    private activityMetrics: ActivityMetricsComputationService,
  ) { }

  async recalculate(raw: any): Promise<{
    data: AssessmentData;
    scopeTotals: {
      scope1: number;
      scope2: number;
      scope3: number;
      total: number;
    };
    topEmissionSources: any[];
    breakdown?: any;
  }> {
    const data = structuredClone(raw);
    data.environment ??= {};
    data.environment.ghg ??= { scope1: {} };

    if (data.activityMetrics && !data.foundationalData?.activityMetrics) {
      data.foundationalData ??= {};
      const rootAm = data.activityMetrics;
      const flattenedAm = {
        ...rootAm,
        ...(rootAm.assetPortfolio?.offshoreSites ? { offshoreSites: rootAm.assetPortfolio.offshoreSites } : {}),
        ...(rootAm.assetPortfolio?.terrestrialSites ? { terrestrialSites: rootAm.assetPortfolio.terrestrialSites } : {}),
      };

      data.foundationalData.activityMetrics = {
        ...(data.foundationalData.activityMetrics || {}),
        ...flattenedAm,
      };
    }



    data.environment.ghg ??= { scope1: {} };
    const ghg = data.environment.ghg!;
    ghg.scope1 ??= {
      stationarySources: {},
      mobileSources: {},
      processEmissions: {},
      fugitiveEmissions: {},
    };

    let scope1Total = 0;
    let scope2Total = 0;
    const breakdown: any = {};

    ghg.scope2 ??= { locationBased: {}, marketBased: {} };

    // GHG Scope 1 Calculations
    if (this.hasData(ghg.scope1.stationarySources)) {
      const group = ghg.scope1.stationarySources;
      group.totalEmission = 0;

      const dto = this.mapStationarySources(group);
      const result = await this.scope1.stationarySources(dto);
      breakdown.stationarySources = result;
      group.totalEmission = result.sum;
      scope1Total += result.sum;

      if (group.electricityHeat) {
        group.electricityHeat.totalEmission = (result.fuel_powered_generator?.value || 0) + (result.gas_powered_turbine?.value || 0);
      }
      if (group.industrialProcess) {
        group.industrialProcess.totalEmission = result.boilers_and_furnaces_in_manufacturing?.value || 0;
      }
      if (group.oilGasOperations) {
        group.oilGasOperations.totalEmission = result.heaters_and_boilers_at_oil_production_facilities?.value || 0;
      }

      this.calculateGroupProgress(
        group,
        ['electricityHeat', 'industrialProcess', 'oilGasOperations'],
        [2, 1, 1],
      );
    }

    if (this.hasData(ghg.scope1.mobileSources)) {
      const group = ghg.scope1.mobileSources;
      group.totalEmission = 0;

      if (
        group.roadTransport ||
        group.vehicleEquipment ||
        group.marineAviation
      ) {
        const dto = this.mapMobileSources(group);
        const result = await this.scope1.mobileSources(dto);
        group.totalEmission = result.sum;
        scope1Total += result.sum;
        breakdown.mobileSources = result;
      }

      this.calculateGroupProgress(
        group,
        ['roadTransport', 'vehicleEquipment', 'marineAviation'],
        [4, 6, 4],
      );
    }

    if (this.hasData(ghg.scope1.processEmissions)) {
      const group = ghg.scope1.processEmissions;
      group.totalEmission = 0;

      const dto = this.mapProcessEmissions(group);
      const result = await this.scope1.ProcessEmission(dto);
      group.totalEmission = result.sum;
      scope1Total += result.sum;
      breakdown.processEmissions = result;

      this.calculateGroupProgress(
        group,
        ['cementManufacturing', 'gasFlaring'],
        [2, 2],
      );
    }

    if (this.hasData(ghg.scope1.fugitiveEmissions)) {
      const group = ghg.scope1.fugitiveEmissions;
      group.totalEmission = 0;

      const dto = this.mapFugitiveEmissions(group);
      const result = await this.scope1.FugitiveEmission(dto);
      group.totalEmission = result.sum || result.venting || 0;
      scope1Total += result.sum || result.venting || 0;
      breakdown.fugitiveEmissions = result;

      this.calculateGroupProgress(
        group,
        ['ventingNaturalGas', 'hfcLeaks'],
        [1, 3],
      );
    }

    ghg.scope1.totalEmission = Number(scope1Total.toFixed(4));
    ghg.scope1.progress = this.calculateScope1Progress(ghg.scope1);

    // GHG Scope 2 Calculations
    // TODO: GHG Protocol requires reporting EITHER location-based or market-based
    // as the primary Scope 2 figure. Currently both are summed, which double-counts
    // when a company fills in both methods. Needs product decision on which to prefer.
    // Location Based
    if (this.hasData(ghg.scope2.locationBased)) {
      const group = ghg.scope2.locationBased;
      const dto = this.mapScope2Location(group);
      const result = await this.scope2.locationBasedEmission(dto);
      group.totalEmission = result.sum;
      scope2Total += result.sum;
      breakdown.scope2Location = result;
    }

    // Market Based
    if (this.hasData(ghg.scope2.marketBased)) {
      const group = ghg.scope2.marketBased;
      const dto = this.mapScope2Market(group);
      const result = await this.scope2.marketBasedEmission(dto);
      group.totalEmission = result.sum;
      scope2Total += result.sum;
      breakdown.scope2Market = result;
    }

    ghg.scope2.totalEmission = Number(scope2Total.toFixed(4));
    ghg.scope2.progress = this.calculateScope2Progress(ghg.scope2);

    // GHG Scope 3 Calculations
    let scope3Total = 0;
    ghg.scope3 ??= { upstream: {}, downstream: {} };

    // Scope 3 Upstream
    if (this.hasData(ghg.scope3.upstream)) {
      const upstream = ghg.scope3.upstream;
      const dto = this.mapUpstreamEmissions(upstream);
      const result = await this.scope3.upstreamEmission(dto);
      upstream.totalEmission = result.sum;
      scope3Total += result.sum;
      breakdown.upstreamEmissions = result;

      this.calculateGroupProgress(
        upstream,
        [
          'purchasedGoodsAndServices',
          'capitalGoods',
          'fuelEnergyRelatedActivities',
          'upstreamTransportationDistribution',
          'wasteGeneratedInOperations',
          'businessTravel',
          'employeeCommuting',
          'upstreamLeasedAssets',
        ],
        [1, 1, 1, 1, 1, 1, 1, 1],
      );
    }

    // Scope 3 Downstream
    if (this.hasData(ghg.scope3.downstream)) {
      const downstream = ghg.scope3.downstream;
      const dto = this.mapDownstreamEmissions(downstream);
      const result = await this.scope3.downstreamEmission(dto);
      downstream.totalEmission = result.sum;
      scope3Total += result.sum;
      breakdown.downstreamEmissions = result;

      this.calculateGroupProgress(
        downstream,
        [
          'downstreamTransportationDistribution',
          'processingSoldProducts',
          'useOfSoldProducts',
          'endOfLifeTreatment',
          'downstreamLeasedAssets',
          'franchises',
          'investments',
        ],
        [1, 1, 1, 1, 1, 1, 1],
      );
    }

    ghg.scope3.totalEmission = Number(scope3Total.toFixed(4));
    ghg.scope3.progress = this.calculateScope3Progress(ghg.scope3);

    // Air Quality Calculations
    if (this.hasData(data.environment?.airQuality?.airPollutantEmissions)) {
      const aq = data.environment.airQuality;
      const result = await this.airQuality.computeAirPollutantEmissions(aq.airPollutantEmissions);
      aq.airPollutantEmissions.calculated = result;
      this.calculateFormProgress(aq.airPollutantEmissions, 1);
    }

    // Water Management Calculations
    if (this.hasData(data.environment?.waterManagement)) {
      const wm = data.environment.waterManagement;
      if (this.hasData(wm.waterAndProducedWaterManagement)) {
        const sub = wm.waterAndProducedWaterManagement;
        if (this.hasData(sub.freshwaterWithdrawals)) {
          sub.freshwaterWithdrawals.calculated = await this.water.computeFreshwaterWithdrawals(sub.freshwaterWithdrawals);
          this.calculateFormProgress(sub.freshwaterWithdrawals, 4);
        }
        if (this.hasData(sub.producedWaterManagement)) {
          sub.producedWaterManagement.calculated = await this.water.computeProducedWaterManagement(sub.producedWaterManagement);
          this.calculateFormProgress(sub.producedWaterManagement, 1);
        }
      }
    }

    // Biodiversity Impact Calculations
    if (this.hasData(data.environment?.biodiversityImpact?.environmentalManagement)) {
      const bio = data.environment.biodiversityImpact;
      const sub = bio.environmentalManagement;
      if (this.hasData(sub.environmentalManagementPolicies)) {
        sub.environmentalManagementPolicies.calculated = await this.biodiversity.computeEnvironmentalManagementPolicies(sub.environmentalManagementPolicies);
        this.calculateFormProgress(sub.environmentalManagementPolicies, 1);
      }
      if (this.hasData(sub.hydrocarbonSpills)) {
        sub.hydrocarbonSpills.calculated = await this.biodiversity.computeHydrocarbonSpills(sub.hydrocarbonSpills);
        this.calculateFormProgress(sub.hydrocarbonSpills, 1);
      }
      if (this.hasData(sub.reservesInSensitiveAreas)) {
        sub.reservesInSensitiveAreas.calculated = await this.biodiversity.computeReservesInSensitiveAreas(sub.reservesInSensitiveAreas);
        this.calculateFormProgress(sub.reservesInSensitiveAreas, 1);
      }
    }

    // Business Innovation Calculations
    // Business Innovation Calculations
    const businessInnovation = data.businessInnovation || data.environment?.businessInnovation;
    if (this.hasData(businessInnovation)) {
      const bi = businessInnovation;

      // Reserves Valuation & Capital Expenditures
      if (this.hasData(bi.reservesValuationAndCapitalExpenditures)) {
        this.calculateGroupProgress(
          bi.reservesValuationAndCapitalExpenditures,
          ['reservesSensitivityToCarbonPricing', 'embeddedCarbonInReserves', 'renewableEnergyInvestment', 'capitalExpenditureStrategy'],
          [1, 1, 1, 1]
        );
      }

      // Business Ethics & Transparency
      if (this.hasData(bi.businessEthicsAndTransparency)) {
        this.calculateGroupProgress(
          bi.businessEthicsAndTransparency,
          ['reservesInCountriesWithHighCorruptionRisk', 'antiCorruptionManagementSystem'],
          [1, 1]
        );
      }
    }

    // Activity Metrics Calc
    if (this.hasData(data.foundationalData?.activityMetrics)) {
      const am = data.foundationalData.activityMetrics;

      if (this.hasData(am.productionVolume)) {
        am.productionVolume.calculated = await this.activityMetrics.computeProductionVolumes(am.productionVolume);
        this.calculateFormProgress(am.productionVolume, 4);
      }
      if (this.hasData(am.offshoreSites)) {
        am.offshoreSites.calculated = await this.activityMetrics.computeOffshoreSites(am.offshoreSites);
        this.calculateFormProgress(am.offshoreSites, 3);
      }
      if (this.hasData(am.terrestrialSites)) {
        am.terrestrialSites.calculated = await this.activityMetrics.computeTerrestrialSites(am.terrestrialSites);
        this.calculateFormProgress(am.terrestrialSites, 3);
      }

      // Aggregate Activity Metrics group progress and dataCount
      this.calculateGroupProgress(
        am,
        ['productionVolume', 'offshoreSites', 'terrestrialSites'],
        [4, 3, 3]
      );
    }

    const totalEmissionVal = scope1Total + scope2Total + scope3Total;
    data.environment.totalEmission = Number(totalEmissionVal.toFixed(4));
    data.totalEmission = Number(totalEmissionVal.toFixed(4));

    data.topEmissionSources = this.deriveTop5(breakdown, totalEmissionVal);

    if (data.foundationalData) {
      data.foundationalData.progress = this.calculateFoundationalProgress(data.foundationalData);
    }

    if (data.environment) {
      data.environment.progress = this.calculateEnvironmentalProgress(data.environment);
    }

    if (data.socialCapital) {
      data.socialCapital.progress = this.calculateSocialProgress(data.socialCapital);
    }

    if (data.humanCapital) {
      data.humanCapital.progress = this.calculateHumanProgress(data.humanCapital);
    }

    if (data.leadershipGovernance) {
      data.leadershipGovernance.progress = this.calculateLeadershipProgress(data.leadershipGovernance);
    }

    if (data.businessInnovation || data.environment?.businessInnovation) {
      const bi = data.businessInnovation || data.environment?.businessInnovation;
      const subProgresses: number[] = [];

      if (bi.reservesValuationAndCapitalExpenditures?.progress != null) {
        subProgresses.push(bi.reservesValuationAndCapitalExpenditures.progress);
      }
      if (bi.businessEthicsAndTransparency?.progress != null) {
        subProgresses.push(bi.businessEthicsAndTransparency.progress);
      }

      data.businessModel = data.businessModel || {};
      if (subProgresses.length > 0) {
        data.businessModel.progress = Number((subProgresses.reduce((a, b) => a + b, 0) / subProgresses.length).toFixed(1));
      } else {
        data.businessModel.progress = 0;
      }
    }

    data.overallProgress = this.calculateOverallProgress(data);

    const counts = this.calculateTotalSectionCounts(data);
    data.completedSections = counts.completed;
    data.totalSections = counts.total;

    return {
      data,
      scopeTotals: {
        scope1: Number(scope1Total.toFixed(4)),
        scope2: Number(scope2Total.toFixed(4)),
        scope3: Number(scope3Total.toFixed(4)),
        total: Number(totalEmissionVal.toFixed(4)),
      },
      topEmissionSources: data.topEmissionSources,
      breakdown,
    };
  }

  private calculateFormProgress(form: any, expected: number = 1) {
    const filledFields = this.countFilledFields(form);
    const count = filledFields;

    form.dataCount = { expected, count };
    const progress = Math.min((count / expected) * 100, 100);
    form.progress = Number(progress.toFixed(1));
  }

  private calculateGroupProgress(
    group: any,
    forms: string[],
    _expectedPerForm?: number[],
  ) {
    let totalCount = 0;
    let totalExpected = 0;

    forms.forEach((formKey, i) => {
      const form = group[formKey];
      if (form) {
        const expected = _expectedPerForm ? _expectedPerForm[i] : 1;
        this.calculateFormProgress(form, expected);
        totalCount += form.dataCount.count;
        totalExpected += expected;
      }
    });

    group.dataCount = { expected: totalExpected, count: totalCount };
    group.progress =
      totalExpected > 0
        ? Number(((totalCount / totalExpected) * 100).toFixed(1))
        : 0;
  }

  private calculateScope1Progress(scope1: any): number {
    const groups = [
      'stationarySources',
      'mobileSources',
      'processEmissions',
      'fugitiveEmissions',
    ];

    const weights = {
      stationarySources: 4,
      mobileSources: 14,
      processEmissions: 4,
      fugitiveEmissions: 4,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    groups.forEach((groupKey) => {
      const group = scope1[groupKey];
      const weight = weights[groupKey];
      totalWeight += weight;
      if (group?.progress != null) {
        weightedSum += (group.progress / 100) * weight;
      }
    });

    return totalWeight > 0
      ? Number(((weightedSum / totalWeight) * 100).toFixed(1))
      : 0;
  }

  private calculateScope2Progress(scope2: any): number {
    const weights = {
      locationBased: 4,
      marketBased: 4,
    };

    let totalFilled = 0;
    let totalExpected = 0;

    // Location Based Progress
    const loc = scope2.locationBased;
    if (loc) {
      const locFields = ['purchasedElectricity', 'cooling', 'steam', 'heating'];
      let count = 0;
      locFields.forEach(f => {
        if (this.hasData(loc[f])) count++;
      });
      loc.dataCount = { expected: 4, count };
      loc.progress = count > 0 ? Number(((count / 4) * 100).toFixed(1)) : 0;
    }

    // Market Based Progress
    const mar = scope2.marketBased;
    if (mar) {
      const marFields = ['ipps', 'eac', 'residual', 'coolingSteam'];
      let count = 0;
      marFields.forEach(f => {
        if (this.hasData(mar[f])) count++;
      });
      mar.dataCount = { expected: 4, count };
      mar.progress = count > 0 ? Number(((count / 4) * 100).toFixed(1)) : 0;
    }

    let weightedSum = 0;
    let totalWeight = 0;

    ['locationBased', 'marketBased'].forEach(key => {
      const weight = weights[key];
      totalWeight += weight;
      if (scope2[key]?.progress != null) {
        weightedSum += (scope2[key].progress / 100) * weight;
      }
    });

    return totalWeight > 0
      ? Number(((weightedSum / totalWeight) * 100).toFixed(1))
      : 0;
  }

  private countFilledFields(obj: any): number {
    let count = 0;
    const ignoredKeys = new Set([
      'progress',
      'dataCount',
      'calculated',
      'status',
      'totalEmission',
      'totalEmissions',
      'breakdown'
    ]);

    for (const key in obj) {
      if (ignoredKeys.has(key)) continue;

      const val = obj[key];
      if (val === undefined || val === null) continue;

      if (Array.isArray(val)) {
        if (val.length > 0) count += 1;
      } else if (typeof val === 'number') {
        // Count 0 as a value? The original code did (val > 0) for numbers, but confusingly allowed 0 in hasValue() helper?
        // Original: typeof val === 'number' && val > 0
        // But hasValue says: if (typeof val === 'number') return true; // 0 is a value
        // Let's stick to val > 0 for consistency with previous logic, OR check if the field implies a zero value is valid.
        // For most ESG data, 0 is a valid input (e.g. 0 emissions), so we should probably count it.
        // However, the previous logic explicitly required val > 0 for numbers in countFilledFields.
        // But hasValue() returns true for 0.
        // Let's allow 0.
        count += 1;
      } else if (typeof val === 'string' && val.trim() !== '') {
        count += 1;
      } else if (typeof val === 'boolean') {
        count += 1;
      } else if (typeof val === 'object') {
        // Nested objects?
        // Some forms might have nested structure.
        // For now, if it's an object and not null, count it?
        // Better to be shallow for now unless we know structure.
        if (Object.keys(val).length > 0) count += 1;
      }
    }

    return count;
  }

  private aggregateGroup(
    group: any,
    formKeys: string[],
    expectedPerForm: number[],
  ) {
    let totalCount = 0;
    let totalExpected = 0;

    formKeys.forEach((key, i) => {
      if (group[key]) {
        const expected = expectedPerForm[i];
        this.calculateFormProgress(group[key], expected);
        totalCount += group[key].dataCount.count;
        totalExpected += expected;
      }
    });

    group.dataCount = { expected: totalExpected, count: totalCount };
    group.progress =
      totalExpected > 0
        ? Number(((totalCount / totalExpected) * 100).toFixed(1))
        : 0;
  }

  private deriveTop5(breakdown: any, total: number) {
    const sources: any[] = [];

    const add = (scope: string, group: string, items: any) => {
      for (const key in items) {
        const val = items[key];
        if (val?.value > 0) {
          sources.push({
            scope,
            group,
            source: this.formatName(key),
            emission: val.value,
          });
        }
      }
    };

    add('scope1', 'stationarySources', breakdown.stationarySources || {});
    add('scope1', 'mobileSources', breakdown.mobileSources || {});
    add('scope1', 'processEmissions', breakdown.processEmissions || {});
    add('scope1', 'fugitiveEmissions', breakdown.fugitiveEmissions || {});
    add('scope2', 'locationBased', breakdown.scope2Location || {});
    add('scope2', 'marketBased', breakdown.scope2Market || {});
    add('scope3', 'upstreamEmissions', breakdown.upstreamEmissions || {});
    add('scope3', 'downstreamEmissions', breakdown.downstreamEmissions || {});

    return sources
      .sort((a, b) => b.emission - a.emission)
      .slice(0, 5)
      .map((s) => ({
        scope: s.scope,
        group: s.group,
        source: s.source,
        emission: s.emission,
        percentage: Number(((s.emission / total) * 100).toFixed(1)),
      }));
  }

  private formatName(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private hasData(obj: any): boolean {
    return obj && Object.keys(obj).length > 0;
  }

  private mapStationarySources(group: any) {
    return {
      fuel_powered: {
        energy_types: this.toEnergyArray(
          group.electricityHeat?.dieselGenerators,
        ),
      },
      gas_powered: {
        energy_types: this.toEnergyArray(group.electricityHeat?.gasTurbines),
      },
      boilers_and_furnance: {
        energy_types: this.toEnergyArray(
          group.industrialProcess?.boilerFurnaces,
        ),
      },
      heaters_and_boilers: {
        energy_types: this.toEnergyArray(
          group.oilGasOperations?.onShoreProduction,
        ),
      },
    };
  }

  private mapMobileSources(group: any) {
    return {
      diesel_truck: {
        energy_types: this.toEnergyArray(group.roadTransport?.vehicleFleet),
      },
      cars_and_buses: {
        energy_types: this.toEnergyArray(group.roadTransport?.carsBuses),
      },
      forklifts_and_other_machinery: {
        energy_types: this.toEnergyArray(
          group.vehicleEquipment?.forkliftFuelType,
        ),
      },
      heavy_duty_vehicles: {
        energy_types: this.toEnergyArray(
          group.vehicleEquipment?.heavyDutyFuelType,
        ),
      },
      tractor_and_other_machineries: {
        energy_types: this.toEnergyArray(
          group.vehicleEquipment?.tractorFuelType,
        ),
      },
      helocopters: {
        energy_types: this.toEnergyArray(group.marineAviation?.air),
      },
      boats_and_vessels: {
        energy_types: this.toEnergyArray(group.marineAviation?.marine),
      },
    };
  }

  private mapProcessEmissions(group: any) {
    return {
      mass_of_cement: Number(group.cementManufacturing?.cementQuantity || 0),
      cement_emission_factor: Number(
        group.cementManufacturing?.emissionFactor || 0.4985,
      ),
      volume_of_flared_gas: Number(group.gasFlaring?.gasVolume || 0),
      gas_emission_factor: Number(group.gasFlaring?.emissionFactor || 2.89),
    };
  }

  private mapFugitiveEmissions(group: any) {
    return {
      volume: Number(group.ventingNaturalGas?.volumeOfGasVented || 0),
      hfcMass: Number(group.hfcLeaks?.refrigerantAdded || group.hfcLeaks?.refrigerant_mass || 0),
    };
  }

  private mapScope2Location(group: any) {
    return {
      electiricity_consumed: Number(group.purchasedElectricity?.electricityConsumed || 0),
      electiricity_emission_factor: 0.45,
      amount_of_cooling_energy_consumed: Number(group.cooling?.coolingConsumed || 0),
      amt_of_c_emission_factor: 0.45,
      total_steam_consumed: Number(group.steam?.volume || 0),
      total_steam_consumed_factor: 0.45,
      total_heating_energy_consumed: Number(group.heating?.heatingConsumed || 0),
      total_heating_energy_consumed_EF: 0.45,
    };
  }

  private mapScope2Market(group: any) {
    return {
      ipp_electricity_consumed: Number(group.ipps?.electricityConsumed || 0),
      ipp_emission_factor: Number(group.ipps?.emissionFactor || 0),
      eac_electricity_consumed: Number(group.eac?.gridElectricity || 0),
      eac_emission_factor: Number(group.eac?.emissionFactor || 0),
      residual_electricity_consumed: Number(group.residual?.electricityConsumed || 0),
      residual_emission_factor: Number(group.residual?.residualMixFactor || 0),
      coolingsteam_energy_consumed: Number(group.coolingSteam?.energyConsumed || 0),
      coolingsteam_emission_factor: Number(group.coolingSteam?.emissionFactor || 0),
    };
  }

  private toEnergyArray(items: any[] = []) {
    return items.map((i) => ({
      value: Number(i.volume || i.energy_consumed || 0),
      emission_factor: Number(i.emissionFactor || i.emission_factor || 0),
    }));
  }

  private mapUpstreamEmissions(upstream: any) {
    return {
      total_amount_spent_on_goods_and_services: Number(
        upstream.purchasedGoodsAndServices?.totalAmountSpent || 0,
      ),
      total_amount_spent_on_goods_and_services_ef: 0.45,
      total_cost_of_capital_goods_purchased: Number(
        upstream.capitalGoods?.totalCost || 0,
      ),
      total_cost_of_capital_goods_purchased_ef: 0.55,
      volume_of_fuel_consumed: Number(
        upstream.fuelEnergyRelatedActivities?.fuelVolume || 0,
      ),
      volume_of_fuel_consumed_ef: 0.55,
      mass_of_goods_transported: Number(
        upstream.upstreamTransportationDistribution?.massOfGoods || 0,
      ),
      distance_travelled: Number(
        upstream.upstreamTransportationDistribution?.distance || 0,
      ),
      mass_of_goods_transported_ef: 0.1,
      total_weight_of_waste_generated: Number(
        upstream.wasteGeneratedInOperations?.wasteWeight || 0,
      ),
      total_weight_of_waste_generated_ef: 0.5,
      total_distance_travelled: Number(upstream.businessTravel?.distance || 0),
      total_distance_travelled_ef: 0.11,
      total_number_of_flights_taken: Number(
        upstream.businessTravel?.numberOfFlights || 0,
      ),
      total_number_of_employee_for_all_trips: Number(
        upstream.businessTravel?.numberOfEmployees || 0,
      ),
      total_passenger_kilometers_travelled: Number(
        upstream.businessTravel?.passengerKilometers || 0,
      ),
      total_passenger_kilometers_travelled_ef: 0.35,
      number_of_employees_commuting: Number(
        upstream.employeeCommuting?.numberOfEmployees || 0,
      ),
      average_distance_commuting: Number(
        upstream.employeeCommuting?.averageDistance || 0,
      ),
      number_of_employees_commuting_ef: 0.2,
      average_number_of_workdays_per_year: 250,
      total_electricity_consumedby_leased_assets: Number(
        upstream.upstreamLeasedAssets?.electricityConsumed || 0,
      ),
      total_electricity_consumedby_leased_assets_ef: 0.526,
      total_fuel_consumedby_leased_assets: Number(
        upstream.upstreamLeasedAssets?.fuelConsumed || 0,
      ),
      total_fuel_consumedby_leased_assets_ef: 2.68,
    };
  }

  private mapDownstreamEmissions(downstream: any) {
    return {
      mass_of_products_sold: Number(
        downstream.downstreamTransportationDistribution?.massOfProductsSold
        || downstream.downstreamTransportationDistribution?.massOfProducts || 0,
      ),
      mass_of_products_sold_ef: 0.1,
      number_of_unit_products_sold: Number(
        downstream.useOfSoldProducts?.unitsSold || 0,
      ),
      expected_lifetime_of_the_product: Number(
        downstream.useOfSoldProducts?.productLifetime || 0,
      ),
      average_annual_fuel_or_energy_consumption_of_product: Number(
        downstream.useOfSoldProducts?.averageAnnualConsumption || 0,
      ),
      emission_factor_of_energy: 0.526,
      end_of_life_treatments: downstream.endOfLifeTreatment?.treatments || [],
      total_fuel_consumed_by_tennant: Number(
        downstream.downstreamLeasedAssets?.otherEnergyConsumed
        || downstream.downstreamLeasedAssets?.fuelConsumed || 0,
      ),
      total_fuel_consumed_by_tennant_ef: 2.68,
      total_electiricity_consumed_by_tennant: Number(
        downstream.downstreamLeasedAssets?.electricityConsumed || 0,
      ),
      total_electiricity_consumed_by_tennant_ef: 0.526,
      total_fuel_consumed_by_franchise: Number(
        downstream.franchises?.fuelConsumption
        || downstream.franchises?.fuelConsumed || 0,
      ),
      total_fuel_consumed_by_franchise_ef: 2.68,
      total_electiricity_consumed_by_franchise: Number(
        downstream.franchises?.electricityConsumption
        || downstream.franchises?.electricityConsumed || 0,
      ),
      total_electiricity_consumed_by_franchise_ef: 0.526,
      investment_equity_share: Number(
        downstream.investments?.investmentAmount
        || downstream.investments?.equityShare || 0,
      ),
      investment_reported_scope_1and2_of_portfolio_company: Number(
        downstream.investments?.portfolioEmissions || 0,
      ),
    };
  }

  private calculateScope3Progress(scope3: any): number {
    let totalProgress = 0;
    let totalWeight = 0;

    if (scope3.upstream?.progress != null) {
      totalProgress += scope3.upstream.progress * 0.5;
      totalWeight += 0.5;
    }

    if (scope3.downstream?.progress != null) {
      totalProgress += scope3.downstream.progress * 0.5;
      totalWeight += 0.5;
    }

    return totalWeight > 0
      ? Number((totalProgress / totalWeight).toFixed(1))
      : 0;
  }

  private calculateEnvironmentalProgress(environment: any): number {
    const topics: number[] = [];

    // GHG Emissions (has 3 scopes)
    if (environment.ghg) {
      if (environment.ghg.scope1?.progress != null) {
        topics.push(environment.ghg.scope1.progress);
      }
      if (environment.ghg.scope2?.progress != null) {
        topics.push(environment.ghg.scope2.progress);
      }
      if (environment.ghg.scope3?.progress != null) {
        topics.push(environment.ghg.scope3.progress);
      }
    }

    // Air Quality
    if (environment.airQuality?.airPollutantEmissions?.progress != null) {
      topics.push(environment.airQuality.airPollutantEmissions.progress);
    }

    // Water Management (has 2 subtopics with multiple forms)
    if (environment.waterManagement) {
      const wm = environment.waterManagement;
      if (wm.waterAndProducedWaterManagement?.freshwaterWithdrawals?.progress != null) {
        topics.push(wm.waterAndProducedWaterManagement.freshwaterWithdrawals.progress);
      }
      if (wm.waterAndProducedWaterManagement?.producedWaterManagement?.progress != null) {
        topics.push(wm.waterAndProducedWaterManagement.producedWaterManagement.progress);
      }
      // Hydraulic fracturing forms
      if (wm.hydraulicFracturingImpacts?.chemicalDisclosure?.progress != null) {
        topics.push(wm.hydraulicFracturingImpacts.chemicalDisclosure.progress);
      }
      if (wm.hydraulicFracturingImpacts?.waterQualityImpacts?.progress != null) {
        topics.push(wm.hydraulicFracturingImpacts.waterQualityImpacts.progress);
      }
    }

    // Biodiversity Impact
    if (environment.biodiversityImpact?.environmentalManagement) {
      const bio = environment.biodiversityImpact.environmentalManagement;
      if (bio.environmentalManagementPolicies?.progress != null) {
        topics.push(bio.environmentalManagementPolicies.progress);
      }
      if (bio.hydrocarbonSpills?.progress != null) {
        topics.push(bio.hydrocarbonSpills.progress);
      }
      if (bio.reservesInSensitiveAreas?.progress != null) {
        topics.push(bio.reservesInSensitiveAreas.progress);
      }
    }

    if (topics.length === 0) return 0;
    const sum = topics.reduce((a, b) => a + b, 0);
    return Number((sum / topics.length).toFixed(1));
  }

  private calculateFoundationalProgress(foundational: any): number {
    const topics: number[] = [];

    if (foundational.activityMetrics) {
      const am = foundational.activityMetrics;
      if (am.productionVolume?.progress != null) {
        topics.push(am.productionVolume.progress);
      }
      if (am.offshoreSites?.progress != null) {
        topics.push(am.offshoreSites.progress);
      }
      if (am.terrestrialSites?.progress != null) {
        topics.push(am.terrestrialSites.progress);
      }
    }

    if (topics.length === 0) return 0;
    const sum = topics.reduce((a, b) => a + b, 0);
    return Number((sum / topics.length).toFixed(1));
  }
  private calculateSocialProgress(social: any): number {
    const topics: number[] = [];

    // Security, Human Rights & Indigenous People
    if (social.securityHumanRights) {
      const forms = [
        'operationsInConflictZones',
        'reservesInNearIndigenousLand',
        'humanRightsEngagementProcesses'
      ];
      this.calculateGroupProgress(social.securityHumanRights, forms, [2, 2, 4]);
      if (social.securityHumanRights.progress != null) topics.push(social.securityHumanRights.progress);
    }

    // Community Relations
    if (social.communityRelations) {
      // Normalize keys from frontend to match expected backend keys
      if (social.communityRelations.communityRisk && !social.communityRelations.communityRiskOpportunityManagement) {
        social.communityRelations.communityRiskOpportunityManagement = social.communityRelations.communityRisk;
      }
      if (social.communityRelations.disputeResolution && !social.communityRelations.communityDisputeResolution) {
        social.communityRelations.communityDisputeResolution = social.communityRelations.disputeResolution;
      }

      const forms = [
        'communityRiskOpportunityManagement',
        'hcdtContribution',
        'communityDisputeResolution',
        'operationalDelays'
      ];
      this.calculateGroupProgress(social.communityRelations, forms, [4, 3, 3, 2]);
      if (social.communityRelations.progress != null) topics.push(social.communityRelations.progress);
    }

    return topics.length > 0
      ? Number((topics.reduce((sum, p) => sum + p, 0) / topics.length).toFixed(1))
      : 0;
  }

  private calculateHumanProgress(human: any): number {
    const topics: number[] = [];
    const weights: number[] = [];

    // Workforce Health & Safety - Safety Management Systems
    // Frontend saves to 'humanCapital.workforceHealthAndSafety.riskAndOpportunityManagement.safetyManagementSystems'
    // So we need to check 'workforceHealthAndSafety' first.
    let safetySource = human.workforceHealthSafety;
    if (!safetySource && human.workforceHealthAndSafety) {
      // Deep path check
      safetySource = human.workforceHealthAndSafety;
      // If it gets mapped by backend service before this, it might be in the short path.
      // But assuming direct DB object:
      if (human.workforceHealthAndSafety.riskAndOpportunityManagement?.safetyManagementSystems) {
        safetySource = human.workforceHealthAndSafety.riskAndOpportunityManagement;
      }
    }

    if (safetySource) {
      if (safetySource.safetyManagementSystems) {
        this.calculateGroupProgress(safetySource, ['safetyManagementSystems'], [4]);
        if (safetySource.safetyManagementSystems.progress != null) {
          topics.push(safetySource.safetyManagementSystems.progress);
          weights.push(0.4);
        }
      } else if (safetySource.progress != null) {
        // Fallback if it was flattened
        topics.push(safetySource.progress);
        weights.push(0.4);
      }
    }

    // Risk and Opportunity - Health & Safety Performance
    if (human.riskAndOpportunityManagement) {
      if (human.riskAndOpportunityManagement.healthAndSafetyPerformance) {
        const hsp = human.riskAndOpportunityManagement.healthAndSafetyPerformance;

        // Handle new nested structure with direct/contract sub-objects
        if (hsp.direct || hsp.contract) {
          let subFilled = 0;
          let subTotal = 0;

          if (hsp.direct) {
            this.calculateFormProgress(hsp.direct, 6);
            subFilled += hsp.direct.dataCount?.count || 0;
            subTotal += 6;
          }

          if (hsp.contract) {
            this.calculateFormProgress(hsp.contract, 6);
            subFilled += hsp.contract.dataCount?.count || 0;
            subTotal += 6;
          }

          hsp.dataCount = { expected: subTotal, count: subFilled };
          hsp.progress =
            subTotal > 0
              ? Number(((subFilled / subTotal) * 100).toFixed(1))
              : 0;

          if (hsp.progress != null) {
            topics.push(hsp.progress);
            weights.push(0.6);
          }
        } else {
          // Legacy flat structure fallback
          this.calculateFormProgress(
            human.riskAndOpportunityManagement.healthAndSafetyPerformance,
            6,
          );
          if (
            human.riskAndOpportunityManagement.healthAndSafetyPerformance
              .progress != null
          ) {
            topics.push(
              human.riskAndOpportunityManagement.healthAndSafetyPerformance
                .progress,
            );
            weights.push(0.6);
          }
        }
      }
    }

    if (topics.length === 0) return 0;

    // Weighted average
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const weightedSum = topics.reduce((sum, p, i) => sum + p * weights[i], 0);

    return totalWeight > 0
      ? Number((weightedSum / totalWeight).toFixed(1))
      : 0;
  }

  private calculateBusinessProgress(business: any): number {
    const topics: number[] = [];

    // Reserves Valuation & CapEx
    if (business.reservesValuation) {
      const forms = [
        'reservesSensitivity',
        'embeddedCarbon',
        'renewableEnergyInvestment',
        'capitalExpenditureStrategy'
      ];
      this.calculateGroupProgress(business.reservesValuation, forms, [3, 4, 3, 2]);
      if (business.reservesValuation.progress != null) topics.push(business.reservesValuation.progress);
    }

    // Business Ethics & Transparency
    if (business.businessEthics) {
      const forms = [
        'reservesCountriesCorruptionRisk',
        'antiCorruptionManagement'
      ];
      this.calculateGroupProgress(business.businessEthics, forms, [3, 4]);
      if (business.businessEthics.progress != null) topics.push(business.businessEthics.progress);
    }

    return topics.length > 0
      ? Number((topics.reduce((sum, p) => sum + p, 0) / topics.length).toFixed(1))
      : 0;
  }

  private calculateLeadershipProgress(leadership: any): number {
    const topics: number[] = [];

    // Critical Incident Risk Management
    if (leadership.criticalIncidentRiskManagement) {
      const forms = [
        'processSafetyEvents',
        'catastrophicRiskManagementSystems'
      ];
      this.calculateGroupProgress(leadership.criticalIncidentRiskManagement, forms, [5, 4]);
      if (leadership.criticalIncidentRiskManagement.progress != null) topics.push(leadership.criticalIncidentRiskManagement.progress);
    }

    // Management of Legal & Regulatory Environment
    if (leadership.legalRegulatoryEnvironment) {
      const forms = [
        'boardManagementOversight',
        'publicPolicyEngagement'
      ];
      this.calculateGroupProgress(leadership.legalRegulatoryEnvironment, forms, [4, 4]);
      if (leadership.legalRegulatoryEnvironment.progress != null) topics.push(leadership.legalRegulatoryEnvironment.progress);
    }

    return topics.length > 0
      ? Number((topics.reduce((sum, p) => sum + p, 0) / topics.length).toFixed(1))
      : 0;
  }

  private calculateTotalSectionCounts(data: any): { completed: number; total: number } {
    // Fix: Using a fixed total number of expected fields/sections across the entire assessment (142).
    // This ensures that "completed of total" matches the overall progress percentage,
    // avoiding the bug where it says "28 of 28 completed" when progress is only 93% 
    // due to untouched sections not being counted in the denominator.
    const TOTAL_SECTIONS = 142;
    const progress = data.overallProgress || 0;
    const completed = Math.round((progress / 100) * TOTAL_SECTIONS);

    return { completed, total: TOTAL_SECTIONS };
  }

  private calculateOverallProgress(data: any): number {
    // Implement weight based calculation for overall progress
    // Weights: Env (40%), Social (20%), Human (10%), Business (20%), Leadership (10%)

    // BUT FIRST: Map Business Innovation to Business Model for Reports
    if (data.environment?.businessInnovation) {
      const bi = data.environment.businessInnovation;
      data.businessModel = data.businessModel || {};

      // Map Reserves Valuation
      if (bi.reservesValuationAndCapitalExpenditures) {
        const src = bi.reservesValuationAndCapitalExpenditures;
        // Ensure singular 'Expenditure' to match Report Type
        data.businessModel.reservesValuationAndCapitalExpenditure = {
          climateImpactOnReserves: {
            carbonPriceScenario: src.reservesSensitivityToCarbonPricing?.carbonPriceScenario,
            reservesAtRiskPercent: src.reservesSensitivityToCarbonPricing?.percentageDecrease,
            totalProvedReserves: src.embeddedCarbonInReserves?.totalProvedReserves,
            totalProbableReserves: 0, // Not captured in form yet?
            embeddedCarbon: src.embeddedCarbonInReserves?.estimatedEmbeddedEmissions
          },
          strategicCapitalAllocation: {
            renewableInvestmentAmount: src.renewableEnergyInvestment?.investmentAmount,
            renewableRevenueAmount: src.renewableEnergyInvestment?.revenueAmount,
            gasProjectsValueCount: 0, // Mapped if available
            maintenanceValueCount: 0,
            renewableProjectsValueCount: 0
          }
        };
        // Progress for sub-parts is already copied via reference or explicit assignment if needed, 
        // but here we just ensure the structure is correct for reports.
        // The overall pillar progress is handled in recalculate()
        if (bi.reservesValuationAndCapitalExpenditures.progress != null) {
          data.businessModel.reservesValuationAndCapitalExpenditure.progress = bi.reservesValuationAndCapitalExpenditures.progress;
        }
      }

      // Map Business Ethics
      if (bi.businessEthicsAndTransparency) {
        const src = bi.businessEthicsAndTransparency;
        data.businessModel.businessEthicsAndTransparency = {
          geopoliticalAndCorruptionRisk: {
            proved: { total: src.reservesInCountriesWithHighCorruptionRisk?.provedReserves || 0, risk: src.reservesInCountriesWithHighCorruptionRisk?.provedReservesAtRisk || 0 },
            probable: { total: src.reservesInCountriesWithHighCorruptionRisk?.probableReserves || 0, risk: src.reservesInCountriesWithHighCorruptionRisk?.probableReservesAtRisk || 0 }
          },
          antiCorruptionManagement: src.antiCorruptionManagementSystem?.systemDescription
        };
        if (bi.businessEthicsAndTransparency.progress != null) {
          data.businessModel.businessEthicsAndTransparency.progress = bi.businessEthicsAndTransparency.progress;
        }
      }
    }

    // Use pre-calculated pillar progress
    const envProgress = data.environment?.progress || 0;
    const socialProgress = data.socialCapital?.progress || 0;
    const humanProgress = data.humanCapital?.progress || 0;
    const businessProgress = data.businessModel?.progress || 0;
    const leadershipProgress = data.leadershipGovernance?.progress || 0;

    const weightedSum =
      (envProgress * 0.4) +
      (socialProgress * 0.2) +
      (humanProgress * 0.1) +
      (businessProgress * 0.2) +
      (leadershipProgress * 0.1);

    return Number(weightedSum.toFixed(1));
  }

  private hasValue(val: any): boolean {
    if (val === undefined || val === null) return false;
    if (typeof val === 'number') return true; // 0 is a value
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  }
}
