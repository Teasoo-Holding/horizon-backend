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
  }> {
    const data = structuredClone(raw);
    data.environment ??= {};
    data.environment.ghg ??= { scope1: {} };

    // Initialize new sections if missing
    data.environment.airQuality ??= { airPollutantEmissions: {} };
    data.environment.waterManagement ??= {
      waterAndProducedWaterManagement: {},
      hydraulicFracturingImpacts: {}
    };
    data.environment.biodiversityImpact ??= { environmentalManagement: {} };

    const ghg = data.environment.ghg!;
    ghg.scope1 ??= {
      stationarySources: {},
      mobileSources: {},
      processEmissions: {},
      fugitiveEmissions: {},
    };

    let scope1Total = 0;
    const breakdown: any = {};

    // --- GHG Scope 1 Calculations ---
    if (this.hasData(ghg.scope1.stationarySources)) {
      const group = ghg.scope1.stationarySources;
      group.totalEmission = 0;

      if (group.electricityHeat) {
        const dto = this.mapStationarySources(group);
        const result = await this.scope1.stationarySources(dto);
        group.electricityHeat.totalEmission = result.sum;
        group.totalEmission += result.sum;
        scope1Total += result.sum;
        breakdown.stationarySources = result;
        this.calculateFormProgress(group.electricityHeat, 2);
      }
      if (group.industrialProcess?.boilerFurnaces?.length > 0) {
        const dto = this.mapStationarySources(group);
        const result = await this.scope1.stationarySources(dto);
        group.industrialProcess.totalEmission = result.sum;
        group.totalEmission += result.sum;
        scope1Total += result.sum;
        this.calculateFormProgress(group.industrialProcess, 1);
      }
      if (group.oilGasOperations?.onShoreProduction?.length > 0) {
        const dto = this.mapStationarySources(group);
        const result = await this.scope1.stationarySources(dto);
        group.oilGasOperations.totalEmission = result.sum;
        group.totalEmission += result.sum;
        scope1Total += result.sum;
        this.calculateFormProgress(group.oilGasOperations, 1);
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

      // Progress tracking for upstream (8 categories)
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
        [1, 1, 1, 1, 1, 1, 1, 1], // 1 field per category
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

      // Progress tracking for downstream (7 categories)
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
        [1, 1, 1, 1, 1, 1, 1], // 1 field per category
      );
    }

    ghg.scope3.totalEmission = Number(scope3Total.toFixed(4));
    ghg.scope3.progress = this.calculateScope3Progress(ghg.scope3);

    // --- Air Quality Calculations ---
    if (data.environment.airQuality) {
      const aq = data.environment.airQuality;
      if (aq.airPollutantEmissions) {
        const result = await this.airQuality.computeAirPollutantEmissions(aq.airPollutantEmissions);
        aq.airPollutantEmissions.calculated = result;
        // Progress for Air Quality
        this.calculateFormProgress(aq.airPollutantEmissions, 1); // Assuming 1 step
      }
    }

    // --- Water Management Calculations ---
    if (data.environment.waterManagement) {
      const wm = data.environment.waterManagement;
      // Subtopic 1: Water and Produced Water Management
      if (wm.waterAndProducedWaterManagement) {
        const sub = wm.waterAndProducedWaterManagement;
        if (sub.freshwaterWithdrawals) {
          sub.freshwaterWithdrawals.calculated = await this.water.computeFreshwaterWithdrawals(sub.freshwaterWithdrawals);
          this.calculateFormProgress(sub.freshwaterWithdrawals, 4); // 4 steps
        }
        if (sub.producedWaterManagement) {
          sub.producedWaterManagement.calculated = await this.water.computeProducedWaterManagement(sub.producedWaterManagement);
          this.calculateFormProgress(sub.producedWaterManagement, 1); // 1 step
        }
      }
      // Subtopic 2: Hydraulic Fracturing Impacts
      if (wm.hydraulicFracturingImpacts) {
        // Empty objects for now as per requirements, but we can init them
        // wm.hydraulicFracturingImpacts.chemicalDisclosure = ...
        // wm.hydraulicFracturingImpacts.waterQualityImpacts = ...
      }
    }

    // --- Biodiversity Impact Calculations ---
    if (data.environment.biodiversityImpact) {
      const bio = data.environment.biodiversityImpact;
      if (bio.environmentalManagement) {
        const sub = bio.environmentalManagement;
        if (sub.environmentalManagementPolicies) {
          sub.environmentalManagementPolicies.calculated = await this.biodiversity.computeEnvironmentalManagementPolicies(sub.environmentalManagementPolicies);
          this.calculateFormProgress(sub.environmentalManagementPolicies, 1);
        }
        if (sub.hydrocarbonSpills) {
          sub.hydrocarbonSpills.calculated = await this.biodiversity.computeHydrocarbonSpills(sub.hydrocarbonSpills);
          this.calculateFormProgress(sub.hydrocarbonSpills, 1);
        }
        if (sub.reservesInSensitiveAreas) {
          sub.reservesInSensitiveAreas.calculated = await this.biodiversity.computeReservesInSensitiveAreas(sub.reservesInSensitiveAreas);
          this.calculateFormProgress(sub.reservesInSensitiveAreas, 1);
        }
      }
    }

    data.environment.totalEmission = Number((scope1Total + scope3Total).toFixed(4));
    data.totalEmission = Number((scope1Total + scope3Total).toFixed(4));

    data.topEmissionSources = this.deriveTop5(breakdown, scope1Total + scope3Total);

    data.overallProgress = ghg.scope1.progress; // This might need to be updated to include other topics progress

    return {
      data,
      scopeTotals: {
        scope1: Number(scope1Total.toFixed(4)),
        scope2: 0,
        scope3: Number(scope3Total.toFixed(4)),
        total: Number((scope1Total + scope3Total).toFixed(4)),
      },
      topEmissionSources: data.topEmissionSources,
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
    let totalProgress = 0;
    let totalWeight = 0;

    groups.forEach((groupKey) => {
      const group = scope1[groupKey];
      if (group?.progress != null) {
        const weight = groupKey === 'stationarySources' ? 0.4 : 0.2;
        totalProgress += group.progress * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0
      ? Number((totalProgress / totalWeight).toFixed(1))
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
    ];

    for (const key in obj) {
      if (!metricKeys.includes(key)) continue;

      const val = obj[key];

      if (Array.isArray(val) && val.length > 0) {
        count += 1;
      } else if (typeof val === 'number' && val > 0) {
        count += 1;
      } else if (typeof val === 'string' && val.trim() !== '') {
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
}
