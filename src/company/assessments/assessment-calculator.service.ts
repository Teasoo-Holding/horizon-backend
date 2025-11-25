import { Injectable } from '@nestjs/common';
import {
  Scope1ComputationService,
  Scope2Computation,
  Scope3ComputationService,
} from 'src/assessment/computation/computation.service';

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
  ) {}

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
    data.environment ??= { ghg: { scope1: {} } };
    const ghg = data.environment.ghg!;
    ghg.scope1 ??= {
      stationarySources: {},
      mobileSources: {},
      processEmissions: {},
      fugitiveEmissions: {},
    };

    let scope1Total = 0;
    const breakdown: any = {};

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

    data.environment.totalEmission = Number(scope1Total.toFixed(4));
    data.totalEmission = Number(scope1Total.toFixed(4));

    data.topEmissionSources = this.deriveTop5(breakdown, scope1Total);

    data.overallProgress = ghg.scope1.progress;

    return {
      data,
      scopeTotals: {
        scope1: Number(scope1Total.toFixed(4)),
        scope2: 0,
        scope3: 0,
        total: Number(scope1Total.toFixed(4)),
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
}
