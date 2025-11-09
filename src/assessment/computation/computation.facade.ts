import { Injectable, Logger } from '@nestjs/common';
import { Scope1ComputationService } from './computation.service';
import { Scope2Computation } from './computation.service';
import { Scope3ComputationService } from './computation.service';
import { MarketBasedEmissionDto } from './dto/scope2-computation.dto';

@Injectable()
export class ComputationFacade {
  private readonly logger = new Logger(ComputationFacade.name);

  constructor(
    private readonly scope1: Scope1ComputationService,
    private readonly scope2: Scope2Computation,
    private readonly scope3: Scope3ComputationService,
  ) {}

  async computeAssessmentTotals(assessmentData: any) {
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
      if (Object.keys(stationary).length) {
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

      if (Object.keys(mobile).length) {
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

      if (
        processEmissions &&
        (processEmissions.cementManufacturing || processEmissions.gasFlaring)
      ) {
        const DEFAULT_EF = 2.68;

        const dto = {
          mass_of_cement: Number(
            processEmissions?.cementManufacturing?.cementQuantity || 0,
          ),
          cement_emission_factor:
            Number(processEmissions?.cementManufacturing?.emissionFactor) ||
            DEFAULT_EF,
          volume_of_flared_gas: Number(
            processEmissions?.gasFlaring?.gasVolume || 0,
          ),
          gas_emission_factor:
            Number(processEmissions?.gasFlaring?.emissionFactor) ||
            Number(processEmissions?.gasFlaring?.carbonContent) ||
            DEFAULT_EF,
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

      if (
        scope2 &&
        (scope2.electricity ||
          scope2.ipps ||
          scope2.eac ||
          scope2.cooling ||
          scope2.steam ||
          scope2.heating ||
          scope2.residual ||
          scope2.coolingSteam)
      ) {
        const locationDto = {
          electiricity_consumed: Number(
            scope2.electricity?.electricityConsumed ?? 0,
          ),
          electiricity_emission_factor:
            Number(scope2.electricity?.emissionFactor ?? 0) || undefined,

          amount_of_cooling_energy_consumed: Number(
            scope2.cooling?.coolingConsumed ?? 0,
          ),
          amt_of_c_emission_factor:
            Number(scope2.cooling?.emissionFactor ?? 0) || undefined,

          total_steam_consumed: Number(scope2.steam?.volume ?? 0),

          total_heating_energy_consumed: Number(
            scope2.heating?.heatingConsumed ?? 0,
          ),
          total_heating_energy_consumed_EF:
            Number(scope2.heating?.emissionFactor ?? 0) || undefined,

          ipps: scope2.ipps
            ? {
                electricityConsumed: Number(
                  scope2.ipps?.electricityConsumed ?? 0,
                ),
                emissionFactor: Number(scope2.ipps?.emissionFactor ?? 0),
              }
            : undefined,
          eac: scope2.eac
            ? {
                gridElectricity: Number(scope2.eac?.gridElectricity ?? 0),
                emissionFactor: Number(scope2.eac?.emissionFactor ?? 0),
              }
            : undefined,
          residual: scope2.residual
            ? {
                electricityConsumed: Number(
                  scope2.residual?.electricityConsumed ?? 0,
                ),
                residualMixFactor: Number(
                  scope2.residual?.residualMixFactor ?? 0,
                ),
              }
            : undefined,
          coolingSteam: scope2.coolingSteam
            ? {
                energyConsumed: Number(
                  scope2.coolingSteam?.energyConsumed ?? 0,
                ),
                emissionFactor: Number(
                  scope2.coolingSteam?.emissionFactor ?? 0,
                ),
              }
            : undefined,
        };

        this.logger.debug(
          'Scope2 - locationDto',
          JSON.stringify(locationDto, null, 2),
        );

        const marketDto: MarketBasedEmissionDto = {
          ipp_electricity_consumed: Number(
            scope2.ipps?.electricityConsumed ?? 0,
          ),
          ipp_emission_factor:
            Number(scope2.ipps?.emissionFactor ?? 0) || undefined,

          eac_electricity_consumed: Number(scope2.eac?.gridElectricity ?? 0),
          eac_emission_factor:
            Number(scope2.eac?.emissionFactor ?? 0) || undefined,

          residual_electricity_consumed: Number(
            scope2.residual?.electricityConsumed ?? 0,
          ),
          residual_emission_factor:
            Number(scope2.residual?.residualMixFactor ?? 0) || undefined,

          coolingsteam_energy_consumed: Number(
            scope2.coolingSteam?.energyConsumed ?? 0,
          ),
          coolingsteam_emission_factor:
            Number(scope2.coolingSteam?.emissionFactor ?? 0) || undefined,
        };

        this.logger.debug(
          'Scope2 - marketDto',
          JSON.stringify(marketDto, null, 2),
        );

        let scope2LocationRes: any = null;
        try {
          if (
            locationDto.electiricity_consumed > 0 ||
            locationDto.amount_of_cooling_energy_consumed > 0 ||
            locationDto.total_steam_consumed > 0 ||
            locationDto.total_heating_energy_consumed > 0
          ) {
            scope2LocationRes = await this.scope2.locationBasedEmission(
              locationDto as any,
            );
            results.breakdown.scope2 = {
              ...results.breakdown.scope2,
              locationBased: scope2LocationRes,
            };
            results.sum += Number(scope2LocationRes.sum || 0);
          }
        } catch (err) {
          this.logger.error('Scope2 location computation failed', err);
        }

        let scope2MarketRes: any = null;
        try {
          if (
            marketDto.ipp_electricity_consumed > 0 ||
            marketDto.eac_electricity_consumed > 0 ||
            marketDto.residual_electricity_consumed > 0 ||
            marketDto.coolingsteam_energy_consumed > 0
          ) {
            scope2MarketRes = await this.scope2.marketBasedEmission(marketDto);
            results.breakdown.scope2 = {
              ...(results.breakdown.scope2 || {}),
              marketBased: scope2MarketRes,
            };
            results.sum += Number(scope2MarketRes.sum || 0);
          }
        } catch (err) {
          this.logger.error('Scope2 market computation failed', err);
        }
      }

      const frontendProgress = assessmentData?.__computed?.progress || assessmentData?.progress || {};


      results.sum = Number((results.sum || 0).toFixed(4));

const scope1Total =
    (results.breakdown.stationarySources?.sum || 0) +
    (results.breakdown.mobileSources?.sum || 0) +
    (results.breakdown.processEmissions?.sum || 0) +
    (results.breakdown.fugitiveEmissions?.sum || 0);

  const scope2Total =
    (results.breakdown.scope2?.locationBased?.sum || 0) +
    (results.breakdown.scope2?.marketBased?.sum || 0);

  const scope3Total = 0;

  const overallTotal = Number((scope1Total + scope2Total + scope3Total).toFixed(4));


      return {
        totals: results,
        scopeTotals: {
      total: overallTotal,
      scope1: scope1Total,
      scope2: scope2Total,
      scope3: scope3Total,
    },
    progress: frontendProgress,
        computedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error('Error computing totals', err);
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
