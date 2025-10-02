// computation.facade
// src/computation/computation.facade.ts
import { Injectable, Logger } from '@nestjs/common';
import { Scope1ComputationService } from './computation.service'; // your file name
import { Scope2Computation } from './computation.service';
import { Scope3ComputationService } from './computation.service';

@Injectable()
export class ComputationFacade {
  private readonly logger = new Logger(ComputationFacade.name);

  constructor(
    private readonly scope1: Scope1ComputationService,
    private readonly scope2: Scope2Computation,
    private readonly scope3: Scope3ComputationService,
  ) {}

  /**
   * Compute totals for the assessment payload.
   * Returns an object with per-scope totals and an overall total.
   */
  async computeAssessmentTotals(assessmentData: any) {
    // defensive checks
    const stationary = assessmentData?.stationarySources || {};
    const mobile = assessmentData?.mobileSources || {};
    const processEmissions = assessmentData?.processEmissions || {};
    const fugitive = assessmentData?.fugitiveEmissions || {};
    const scope2 = {
      electricity: assessmentData?.electricity,
      cooling: assessmentData?.cooling,
      steam: assessmentData?.steam,
      heating: assessmentData?.heating,
      ipps: assessmentData?.ipps,
      eac: assessmentData?.eac,
      residual: assessmentData?.residual,
      coolingSteam: assessmentData?.coolingSteam,
    };

    const results: any = { breakdown: {}, sum: 0 };

    try {
      // Scope1 / Stationary sources
      if (Object.keys(stationary).length) {
        // convert your form structure into DTO expected by scope1.stationarySources
        const dto = {
          fuel_powered: {
            energy_types:
              (stationary?.electricityHeat?.dieselGenerators || []).map(
                (s) => ({
                  value: Number(s.volume || 0),
                  emission_factor: Number(s.emissionFactor || 0),
                }),
              ) || [],
          },
          gas_powered: {
            energy_types:
              (stationary?.electricityHeat?.gasTurbines || []).map((s) => ({
                value: Number(s.volume || 0),
                emission_factor: Number(s.emissionFactor || 0),
              })) || [],
          },
          boilers_and_furnance: {
            energy_types:
              (stationary?.industrialProcesses?.boilerFurnaces || []).map(
                (s) => ({
                  value: Number(s.volume || 0),
                  emission_factor: Number(s.emissionFactor || 0),
                }),
              ) || [],
          },
          heaters_and_boilers: {
            energy_types:
              (stationary?.oilGasOperations?.onShoreProduction || []).map(
                (s) => ({
                  value: Number(s.volume || 0),
                  emission_factor: Number(s.emissionFactor || 0),
                }),
              ) || [],
          },
        };

        const scope1Stationary = await this.scope1.stationarySources(dto);
        const stationaryTotal = Number(scope1Stationary.sum || 0);
        results.breakdown.stationarySources = scope1Stationary;
        results.sum += stationaryTotal;
      }

      // Scope1 / Mobile sources (if present)
      if (Object.keys(mobile).length) {
        // Construct DTO according to your computation service expected shape
        const mobileDto = {
          diesel_truck: {
            energy_types: (mobile?.roadTransport?.vehicleFleet || []).map(
              (s) => ({
                value: Number(s.volume || 0),
                emission_factor: Number(s.emissionFactor || 0),
              }),
            ),
          },
          cars_and_buses: {
            energy_types: (mobile?.roadTransport?.carsBuses || []).map((s) => ({
              value: Number(s.volume || 0),
              emission_factor: Number(s.emissionFactor || 0),
            })),
          },
          forklifts_and_other_machinery: {
            energy_types: (
              mobile?.vehicleEquipment?.forkliftFuelType || []
            ).map((s) => ({
              value: Number(s.volume || 0),
              emission_factor: Number(s.emissionFactor || 0),
            })),
          },
          heavy_duty_vehicles: {
            energy_types: (
              mobile?.vehicleEquipment?.heavyDutyFuelType || []
            ).map((s) => ({
              value: Number(s.volume || 0),
              emission_factor: Number(s.emissionFactor || 0),
            })),
          },
          tractor_and_other_machineries: {
            energy_types: (mobile?.vehicleEquipment?.tractorFuelType || []).map(
              (s) => ({
                value: Number(s.volume || 0),
                emission_factor: Number(s.emissionFactor || 0),
              }),
            ),
          },
          helocopters: {
            energy_types: (mobile?.marineAviation?.air || []).map((s) => ({
              value: Number(s.volume || 0),
              emission_factor: Number(s.emissionFactor || 0),
            })),
          },
          boats_and_vessels: {
            energy_types: (mobile?.marineAviation?.marine || []).map((s) => ({
              value: Number(s.volume || 0),
              emission_factor: Number(s.emissionFactor || 0),
            })),
          },
        };

        const mobileResult = await this.scope1.mobileSources(mobileDto);
        results.breakdown.mobileSources = mobileResult;
        results.sum += Number(mobileResult.sum || 0);
      }

      // Process emissions
      // Process emissions
      if (
        processEmissions &&
        (processEmissions.cementManufacturing || processEmissions.gasFlaring)
      ) {
        const DEFAULT_EF = 2.68; // kgCO2/litre

        const dto = {
          mass_of_cement: Number(
            processEmissions?.cementManufacturing?.cementQuantity || 0,
          ),
          cement_emission_factor:
            Number(processEmissions?.cementManufacturing?.emissionFactor) ||
            DEFAULT_EF, // fallback if frontend didn't supply EF
          volume_of_flared_gas: Number(
            processEmissions?.gasFlaring?.gasVolume || 0,
          ),
          gas_emission_factor:
            Number(processEmissions?.gasFlaring?.emissionFactor) ||
            Number(processEmissions?.gasFlaring?.carbonContent) ||
            DEFAULT_EF, // fallback if nothing present
        };

        const proc = await this.scope1.ProcessEmission(dto);
        results.breakdown.processEmissions = proc;
        results.sum += Number(proc.sum || 0);
      }

      // Fugitive
      if (fugitive && (fugitive.ventingNaturalGas || fugitive.hfcLeaks)) {
        const dto = {
          volume: Number(fugitive?.ventingNaturalGas?.volumeOfGasVented || 0),
          methaneDensity: undefined,
          gwp: undefined,
        };
        const fug = await this.scope1.FugitiveEmission(dto);
        results.breakdown.fugitiveEmissions = fug;
        results.sum += Number(fug.sum || fug.venting || 0);
      }

      // Scope2 (location or market based) — run whichever DTO is more appropriate
      if (scope2 && (scope2.electricity || scope2.ipps || scope2.eac)) {
        const locationDto = {
          electiricity_consumed: Number(
            scope2.electricity?.electricityConsumed || 0,
          ),
          electiricity_emission_factor:
            Number(scope2.electricity?.emissionFactor || 0) || undefined,
          amount_of_cooling_energy_consumed: Number(
            scope2.cooling?.coolingConsumed || 0,
          ),
          total_steam_consumed: Number(scope2.steam?.volume || 0),
          total_heating_energy_consumed: Number(
            scope2.heating?.heatingConsumed || 0,
          ),
          total_heating_energy_consumed_EF:
            Number(scope2.heating?.emissionFactor || 0) || undefined,
        };

        const scope2Res = await this.scope2.locationBasedEmission(locationDto);
        results.breakdown.scope2 = scope2Res;
        results.sum += Number(scope2Res.sum || 0);
      }

      // scope3 — optional, skip here or compute based on presence
      // ... you can call scope3.upstreamEmission/dowstreamEmission similarly if scope3 data included

      // round sum for readability
      results.sum = Number((results.sum || 0).toFixed(4));

      // return a totals shaped object
      return {
        totals: results, // contains per-section breakdown and `sum`
        computedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error('Error computing totals', err);
      // If computation fails, still return zeros to avoid breaking submit flow
      return {
        totals: {
          breakdown: {},
          sum: 0,
        },
        computedAt: new Date().toISOString(),
        error: String(err),
      };
    }
  }
}
