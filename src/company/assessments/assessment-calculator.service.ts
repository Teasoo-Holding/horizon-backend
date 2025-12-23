import { Injectable } from '@nestjs/common';
import {
  Scope1ComputationService,
  Scope2Computation,
  Scope3ComputationService,
} from 'src/assessment/computation/computation.service';
import { AirQualityComputationService } from 'src/assessment/computation/air-quality.service';
import { WaterComputationService } from 'src/assessment/computation/water.service';
import { BiodiversityComputationService } from 'src/assessment/computation/biodiversity.service';

interface AssessmentData {
  environment?: any;
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

    // --- GHG Scope 1 Calculations ---
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

    // --- GHG Scope 2 Calculations ---
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

    // --- GHG Scope 3 Calculations ---
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

    // --- Air Quality Calculations ---
    if (this.hasData(data.environment?.airQuality?.airPollutantEmissions)) {
      const aq = data.environment.airQuality;
      const result = await this.airQuality.computeAirPollutantEmissions(aq.airPollutantEmissions);
      aq.airPollutantEmissions.calculated = result;
      this.calculateFormProgress(aq.airPollutantEmissions, 1);
    }

    // --- Water Management Calculations ---
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

    // --- Biodiversity Impact Calculations ---
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

    const totalEmissionVal = scope1Total + scope2Total + scope3Total;
    data.environment.totalEmission = Number(totalEmissionVal.toFixed(4));
    data.totalEmission = Number(totalEmissionVal.toFixed(4));

    data.topEmissionSources = this.deriveTop5(breakdown, totalEmissionVal);

    const environmentalProgress = this.calculateEnvironmentalProgress(data.environment);
    data.overallProgress = environmentalProgress;

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

  private calculateFormProgress(form: any, expected: number) {
    const count = this.countFilledFields(form);
    form.dataCount = { expected, count };
    form.progress =
      expected > 0 ? Number(((count / expected) * 100).toFixed(1)) : 0;
  }

  private calculateGroupProgress(
    group: any,
    forms: string[],
    expectedPerForm?: number[],
  ) {
    let totalCount = 0;
    let totalExpected = 0;

    forms.forEach((formKey, i) => {
      const form = group[formKey];
      if (form) {
        const expected = expectedPerForm?.[i] || 10;
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
      loc.progress = Number(((count / 4) * 100).toFixed(1));
    }

    // Market Based Progress
    const mar = scope2.marketBased;
    if (mar) {
      const marFields = ['ipps', 'eac', 'residual', 'coolingSteam'];
      let count = 0;
      marFields.forEach(f => {
        if (this.hasData(mar[f])) count++;
      });
      mar.progress = Number(((count / 4) * 100).toFixed(1));
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

    const metricKeys = [
      'dieselGenerators',
      'gasTurbines',
      'boilerFurnaces',
      'onShoreProduction',
      'vehicleFleet',
      'carsBuses',
      'forkliftFuelType',
      'heavyDutyFuelType',
      'tractorFuelType',
      'air',
      'marine',
      'cementQuantity',
      'gasVolume',
      'volumeOfGasVented',
      'refrigerant_mass',
    ];

    for (const key of metricKeys) {
      const val = obj[key];

      if (val === undefined || val === null) continue;

      if (Array.isArray(val)) {
        // For array fields, count if there's at least one non-zero volume entry
        const hasValues = val.some((item: any) =>
          item.volume && parseFloat(item.volume.toString()) > 0,
        );
        if (hasValues) count += 1;
      } else if (typeof val === 'number' && val > 0) {
        count += 1;
      } else if (typeof val === 'string' && val.trim() !== '' && val !== '0') {
        count += 1;
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
      hfcMass: Number(group.hfcLeaks?.refrigerant_mass || 0),
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
        downstream.downstreamTransportationDistribution?.massOfProducts || 0,
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
        downstream.downstreamLeasedAssets?.fuelConsumed || 0,
      ),
      total_fuel_consumed_by_tennant_ef: 2.68,
      total_electiricity_consumed_by_tennant: Number(
        downstream.downstreamLeasedAssets?.electricityConsumed || 0,
      ),
      total_electiricity_consumed_by_tennant_ef: 0.526,
      total_fuel_consumed_by_franchise: Number(
        downstream.franchises?.fuelConsumed || 0,
      ),
      total_fuel_consumed_by_franchise_ef: 2.68,
      total_electiricity_consumed_by_franchise: Number(
        downstream.franchises?.electricityConsumed || 0,
      ),
      total_electiricity_consumed_by_franchise_ef: 0.526,
      investment_equity_share: Number(downstream.investments?.equityShare || 0),
      investment_reported_scope_1and2_of_portfolio_company: Number(
        downstream.investments?.portfolioEmissions || 0,
      ),
    };
  }

  private calculateScope3Progress(scope3: any): number {
    let totalProgress = 0;
    let totalWeight = 0;

    // Weight upstream and downstream equally
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

  /**
   * Calculate progress for the Environmental pillar
   * This will be combined with other pillars (Social Capital, Human Capital, etc.)
   * to determine overall assessment progress
   */
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

    // Average progress across all environmental topics that HAVE data
    // This prevents empty sections from dragging the average down to 33.3%
    return topics.length > 0
      ? Number((topics.reduce((sum, p) => sum + p, 0) / topics.length).toFixed(1))
      : 0;
  }
}
