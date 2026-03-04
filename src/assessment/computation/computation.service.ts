import { Injectable } from '@nestjs/common';
import {
  AmmoniaUreaComputationDto,
  BasicComputationDto,
  BusinessTravelDto,
  CementComputationDto,
  EmployeeCommutingDto,
  EndOfLifeTreatmentSoldProductsDto,
  FlaringComputationDto,
  FranchiseEnergyInputDto,
  FuelComputationsDto,
  FuelEnergyRelatedActivitiesDto,
  GoodsAndServicesDto,
  MobileSourcesDto,
  MultipleEnergyComputationDto,
  NationalGridComputationDto,
  OilGasVentingDto,
  RefigirantComputationDto,
  StationarySourcesDto,
  UpstreamTransportationDistributionDto,
  UseSoldProductsDto,
  WasteGeneratedOperationsDto,
} from './dto/create-computation.dto';
import { ProcessEmissionDto } from './dto/process-emission.dto';
import { FugitiveEmissionCalculationDto } from './dto/fugutive-emission.dto';
import {
  LocationBasedEmissionDto,
  MarketBasedEmissionDto,
} from './dto/scope2-computation.dto';
import { UpstreamEmissionDto } from './dto/upstream-computation.dto';
import { DownstreamEmisionDto } from './dto/downstream-computation.dto';

@Injectable()
export class Scope1ComputationService {
  private readonly EF_VENTING = 0.656; // this is kgCO2/m³
  private readonly EF_HFC = 1300; // kgCO2e/kg
  private readonly EF_CEMENT = 0.4985; // tCO2/t cement
  private readonly EF_FLARING = 2.6; // kgCO2e/m³ gas // Updated from 2.89 based on GHG guide
  constructor() { }

  //  Diesel Generators, Diesel Vehicles, Fuel Oil (LPFO/HPFO)
  async directEmissionComputations(dto: BasicComputationDto) {
    const value = (dto.value * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  async generalEnergyTypesComputation(dto: MultipleEnergyComputationDto) {
    if (!dto.energy_types || dto.energy_types.length === 0) {
      return { value: 0, unit: 'tCO2e' };
    }

    const total = dto.energy_types.reduce((sum, fuel) => {
      return sum + fuel.value * fuel.emission_factor;
    }, 0);

    const value = total / 1000; // convert to tonnes

    return {
      value: Number(value.toFixed(4)), // round for clarity
      unit: 'tCO2e',
    };
  }

  // Natural Gas Combustion (Turbines/Boilers)
  async naturalGasCombustionComputations(dto: FranchiseEnergyInputDto) {
    const value = (dto.energy_consumed * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // LPG (Cooking/Industry), Petrol Vehicles, Natural Gas Vehicles (CNG)
  async LPGComputations(dto: { energy_types: Array<BasicComputationDto> }) {
    const value =
      dto.energy_types.reduce((sum, fuel) => {
        return sum + fuel.value * fuel.emission_factor;
      }, 0) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Aviation (Jet fuel)
  async aviationComputations(dto: FuelComputationsDto) {
    const value = (dto.fuel_volume * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Oil & Gas Venting/Leaks (Fugitive Emissions)
  async oilGasVentingComputations(dto: OilGasVentingDto) {
    const value =
      (dto.gas_volume_released *
        (dto.methane_density || 0.656) *
        (dto.global_warming_potential || 28)) /
      1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Refrigerants (HFC Leaks)
  async refrigerantsComputations(dto: RefigirantComputationDto) {
    const value = (dto.refrigerant_mass * dto.global_warming_potential) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Cement Manufacturing
  async cementManufacturingComputations(dto: CementComputationDto) {
    const value = dto.cement_produced * dto.emission_factor;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Flaring in Oil & Gas
  async flaringComputations(dto: FlaringComputationDto) {
    const value = (dto.gas_volume_flaring * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Ammonia/urea Production
  async ammoniaUreaComputations(dto: AmmoniaUreaComputationDto) {
    const value = (dto.ammonia_produced * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // National Grid (Nigeria)
  async nationalGridComputations(dto: NationalGridComputationDto) {
    const value = (dto.electricity_consumed * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Purchased Steam/heat/cool
  async purchasedSteamComputations(dto: FranchiseEnergyInputDto) {
    const value = (dto.energy_consumed * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Purchased Goods & Services
  async purchasedGoodsServicesComputations(dto: GoodsAndServicesDto) {
    const value = (dto.expenditure * dto.economic_emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Capital Goods
  async capitalGoodsComputations(dto: GoodsAndServicesDto) {
    const value = (dto.expenditure * dto.economic_emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Fuel- & Energy-Related Activities (Not in Scope 1 & 2)
  async fuelEnergyRelatedActivitiesComputations(
    dto: FuelEnergyRelatedActivitiesDto,
  ) {
    const value =
      (dto.total_energy_spent * dto.upstream_lifecycle_emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Upstream Transportation & Distribution
  async upstreamTransportationDistributionComputations(
    dto: UpstreamTransportationDistributionDto,
  ) {
    const value =
      (dto.distance * dto.mass_of_goods * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Waste Generated in Operations
  async wasteGeneratedOperationsComputations(dto: WasteGeneratedOperationsDto) {
    const value = dto.waste_mass * dto.emission_factor;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Business Travel
  async businessTravelComputations(dto: BusinessTravelDto) {
    const value = (dto.distance * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Employee Commuting
  async employeeCommutingComputations(dto: EmployeeCommutingDto) {
    const value =
      (dto.number_of_employee *
        dto.average_daily_commuting_distance *
        dto.emission_factor_of_commuting_mode) /
      1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Upstream Leased Assets
  async upstreamLeasedAssetsComputations(dto: BasicComputationDto) {
    const value = (dto.value * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Downstream Transportation & Distribution
  async downstreamTransportationDistributionComputations(
    dto: BasicComputationDto,
  ) {
    const value = (dto.value * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Processing of Sold Products
  async processingSoldProductsComputations(dto: BasicComputationDto) {
    const value = (dto.value * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Use of Sold Products
  async useSoldProductsComputations(dto: UseSoldProductsDto) {
    const value =
      (dto.product_lifetime_energy_consumption *
        dto.number_of_units_sold *
        dto.regional_grid_emission_factor *
        dto.estimated_average_product_lifetime) /
      1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  //  End-of-Life Treatment of Sold Products
  async endOfLifeTreatmentSoldProductsComputations(
    dto: EndOfLifeTreatmentSoldProductsDto,
  ) {
    const value =
      (dto.total_mass_of_products_sold *
        dto.emission_factor_for_end_of_life_treatment_method) /
      1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Downstream Leased Assets
  async downstreamLeasedAssetsComputations(dto: BasicComputationDto) {
    const value = (dto.value * dto.emission_factor) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  // Franchises
  async franchisesComputations(energies: FranchiseEnergyInputDto[]) {
    const breakdown: {
      type: string;
      energy_consumed: number;
      emission_factor: number;
      value: number;
      unit: string;
    }[] = energies.map((e) => ({
      type: e.type,
      energy_consumed: e.energy_consumed,
      emission_factor: e.emission_factor,
      value: (e.energy_consumed * e.emission_factor) / 1000,
      unit: 'tCO2e',
    }));

    const totalValue = breakdown.reduce((sum, e) => sum + e.value, 0);

    return {
      total: {
        value: totalValue,
        unit: 'tCO2e',
      },
      breakdown,
    };
  }

  // Investments
  async investmentsComputations(dto: BasicComputationDto) {
    const value = dto.value * dto.emission_factor;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  async stationarySources(dto: StationarySourcesDto) {
    const fuel_powered_generator = await this.generalEnergyTypesComputation(
      dto.fuel_powered,
    );
    const gas_powered_turbine = await this.generalEnergyTypesComputation(
      dto.gas_powered,
    );
    const boilers_and_furnaces_in_manufacturing =
      await this.generalEnergyTypesComputation(dto.boilers_and_furnance);
    const heaters_and_boilers_at_oil_production_facilities =
      await this.generalEnergyTypesComputation(dto.heaters_and_boilers);

    return {
      fuel_powered_generator,
      gas_powered_turbine,
      boilers_and_furnaces_in_manufacturing,
      heaters_and_boilers_at_oil_production_facilities,
      sum:
        (fuel_powered_generator?.value ?? 0) +
        (gas_powered_turbine?.value ?? 0) +
        (boilers_and_furnaces_in_manufacturing?.value ?? 0) +
        (heaters_and_boilers_at_oil_production_facilities?.value ?? 0),
    };
  }

  async mobileSources(dto: MobileSourcesDto) {
    const diesel_truck = await this.generalEnergyTypesComputation(
      dto.diesel_truck,
    );
    const cars_and_buses = await this.generalEnergyTypesComputation(
      dto.cars_and_buses,
    );
    const forklifts_and_other_machinery =
      await this.generalEnergyTypesComputation(
        dto.forklifts_and_other_machinery,
      );
    const heavy_duty_vehicles = await this.generalEnergyTypesComputation(
      dto.heavy_duty_vehicles,
    );
    const tractor_and_other_machineries =
      await this.generalEnergyTypesComputation(
        dto.tractor_and_other_machineries,
      );
    const helocopters = await this.generalEnergyTypesComputation(
      dto.helocopters,
    );
    const boats_and_vessels = await this.generalEnergyTypesComputation(
      dto.boats_and_vessels,
    );

    return {
      diesel_truck,
      cars_and_buses,
      forklifts_and_other_machinery,
      heavy_duty_vehicles,
      tractor_and_other_machineries,
      helocopters,
      boats_and_vessels,
      sum:
        (diesel_truck.value ?? 0) +
        (cars_and_buses.value ?? 0) +
        (forklifts_and_other_machinery.value ?? 0) +
        (heavy_duty_vehicles.value ?? 0) +
        (tractor_and_other_machineries.value ?? 0) +
        (helocopters.value ?? 0) +
        (boats_and_vessels.value ?? 0),
    };
  }

  async FugitiveEmission(dto: FugitiveEmissionCalculationDto) {
    // GHG Guide: Volume * Methane Density (0.656) * GWP (28) = kgCO2e. Then divide by 1000 for tonnes.
    const venting = ((dto.volume || 0) * this.EF_VENTING * 28) / 1000;
    const hfc = (dto as any).hfcMass
      ? ((dto as any).hfcMass * this.EF_HFC) / 1000
      : 0;

    return { venting, hfc, sum: venting + hfc, unit: 'tCO2e' };
  }

  async ProcessEmission(dto: ProcessEmissionDto) {
    const cement = (dto.mass_of_cement || 0) * this.EF_CEMENT;
    const flaring = ((dto.volume_of_flared_gas || 0) * this.EF_FLARING) / 1000;

    return { cement, flaring, sum: cement + flaring, unit: 'tCO2e' };
  }
}

export class Scope2Computation {
  private readonly ELECTRIC_EMISSION_FACTOR = 0.526;
  private readonly COOLING_EMISSION_FACTOR = 0.25;

  async directEmissionComputations(amount, ef) {
    const value = (amount * ef) / 1000;
    return {
      value,
      unit: 'tCO2​e',
    };
  }

  async locationBasedEmission(dto: LocationBasedEmissionDto) {
    const electric_EF = dto.electiricity_emission_factor || 0.526;
    const cooling_EF =
      dto.amt_of_c_emission_factor || this.COOLING_EMISSION_FACTOR;

    const amount_of_cooling_energy_consumed =
      await this.directEmissionComputations(
        dto.amount_of_cooling_energy_consumed,
        cooling_EF,
      );

    const electricity_consumed = await this.directEmissionComputations(
      dto.electiricity_consumed,
      electric_EF,
    );
    const total_steam_consumed = await this.directEmissionComputations(
      dto.total_steam_consumed,
      cooling_EF,
    );
    const total_heating_energy_consumed = await this.directEmissionComputations(
      dto.total_heating_energy_consumed,
      dto.total_heating_energy_consumed_EF,
    );

    return {
      electricity_consumed,
      amount_of_cooling_energy_consumed,
      total_steam_consumed,
      total_heating_energy_consumed,
      sum:
        (electricity_consumed.value ?? 0) +
        (amount_of_cooling_energy_consumed.value ?? 0) +
        (total_heating_energy_consumed.value ?? 0) +
        (total_steam_consumed.value ?? 0),
    };
  }

  async marketBasedEmission(dto: MarketBasedEmissionDto) {
    const ipp = await this.directEmissionComputations(
      dto.ipp_electricity_consumed,
      dto.ipp_emission_factor,
    );

    const eac = await this.directEmissionComputations(
      dto.eac_electricity_consumed,
      dto.eac_emission_factor,
    );

    const residual = await this.directEmissionComputations(
      dto.residual_electricity_consumed,
      dto.residual_emission_factor,
    );

    const coolingSteam = await this.directEmissionComputations(
      dto.coolingsteam_energy_consumed,
      dto.coolingsteam_emission_factor,
    );

    return {
      ipp,
      eac,
      residual,
      coolingSteam,
      sum:
        (ipp.value ?? 0) +
        (eac.value ?? 0) +
        (residual.value ?? 0) +
        (coolingSteam.value ?? 0),
    };
  }
}

export class Scope3ComputationService {
  async transportationEmissionComputations(mass, distance, emission_factor) {
    const value = (mass * distance * emission_factor) / 1000;
    return value;
  }

  async directEmissionComputations(mass, emission_factor) {
    const value = (mass * emission_factor) / 1000;
    return value;
  }

  async travelEmissionComputation(distance, ef) {
    return (distance * ef) / 1000;
  }

  async upstreamEmission(dto: UpstreamEmissionDto) {
    const total_amount_spent_on_goods_and_services =
      await this.directEmissionComputations(
        dto.total_amount_spent_on_goods_and_services,
        dto.total_amount_spent_on_goods_and_services !== undefined ? (dto.total_amount_spent_on_goods_and_services_ef ?? 0.45) : 0,
      );

    const total_cost_of_capital_goods_purchased =
      await this.directEmissionComputations(
        dto.total_cost_of_capital_goods_purchased,
        dto.total_cost_of_capital_goods_purchased !== undefined ? (dto.total_cost_of_capital_goods_purchased_ef ?? 0.55) : 0,
      );

    const volume_of_fuel_consumed = await this.directEmissionComputations(
      dto.volume_of_fuel_consumed,
      dto.volume_of_fuel_consumed !== undefined ? (dto.volume_of_fuel_consumed_ef ?? 0.55) : 0,
    );

    const mass_of_goods_transported =
      await this.transportationEmissionComputations(
        dto.mass_of_goods_transported,
        dto.distance_travelled,
        dto.mass_of_goods_transported_ef,
      );

    const total_weight_of_waste_generated =
      await this.directEmissionComputations(
        dto.total_weight_of_waste_generated,
        dto.total_weight_of_waste_generated_ef,
      );

    const ground_travel = await this.travelEmissionComputation(
      dto.total_distance_travelled,
      dto.total_distance_travelled_ef ?? 0.11,
    );
    const air_travel = await this.travelEmissionComputation(
      dto.total_number_of_flights_taken *
      dto.total_number_of_employee_for_all_trips *
      dto.total_passenger_kilometers_travelled,
      dto.total_passenger_kilometers_travelled_ef ?? 0.35,
    );

    const employee_commuting =
      ((dto.number_of_employees_commuting || 0) *
        (dto.average_distance_commuting || 0) *
        (dto.number_of_employees_commuting_ef ?? 0.2) *
        (dto.average_number_of_workdays_per_year || 250)) / 1000;

    const upstream_leased_asset =
      ((dto.total_electricity_consumedby_leased_assets || 0) *
        (dto.total_electricity_consumedby_leased_assets_ef ?? 0.526)) /
      1000 +
      ((dto.total_fuel_consumedby_leased_assets || 0) *
        (dto.total_fuel_consumedby_leased_assets_ef ?? 2.68)) /
      1000;

    return {
      total_amount_spent_on_goods_and_services,
      total_cost_of_capital_goods_purchased,
      volume_of_fuel_consumed,
      mass_of_goods_transported,
      total_weight_of_waste_generated,
      ground_travel,
      air_travel,
      employee_commuting,
      upstream_leased_asset,
      sum:
        total_amount_spent_on_goods_and_services +
        total_cost_of_capital_goods_purchased +
        volume_of_fuel_consumed +
        mass_of_goods_transported +
        total_weight_of_waste_generated +
        ground_travel +
        air_travel +
        employee_commuting +
        upstream_leased_asset,
    };
  }

  async downstreamEmission(dto: DownstreamEmisionDto) {
    const mass_of_products_sold =
      (dto.mass_of_products_sold * dto.mass_of_products_sold_ef) / 1000;

    const use_of_sold_products =
      (dto.number_of_unit_products_sold *
        dto.expected_lifetime_of_the_product *
        dto.average_annual_fuel_or_energy_consumption_of_product *
        dto.emission_factor_of_energy || 0.526) / 1000;

    const eol_emissions: { type: string; value: number }[] = [];

    for (const item of dto.end_of_life_treatments) {
      const result = item.mass_of_products * item.type_of_material_ef;

      eol_emissions.push({
        type: item.type_of_material,
        value: result,
      });
    }
    let eol_emission_summation = eol_emissions.reduce(
      (sum, val) => sum + val.value,
      0,
    );
    eol_emission_summation = eol_emission_summation / 1000;

    const downstream_leased_asset =
      (dto.total_fuel_consumed_by_tennant *
        dto.total_fuel_consumed_by_tennant_ef +
        dto.total_electiricity_consumed_by_tennant *
        dto.total_electiricity_consumed_by_tennant_ef) /
      1000;

    const franchise =
      (dto.total_fuel_consumed_by_franchise *
        dto.total_fuel_consumed_by_franchise_ef +
        dto.total_electiricity_consumed_by_franchise *
        dto.total_electiricity_consumed_by_franchise_ef) /
      1000;

    const investment =
      (dto.investment_equity_share *
        dto.investment_reported_scope_1and2_of_portfolio_company) /
      1000;

    return {
      mass_of_products_sold,
      use_of_sold_products,
      eol_emission_summation,
      downstream_leased_asset,
      franchise,
      investment,
      sum:
        mass_of_products_sold +
        use_of_sold_products +
        eol_emission_summation +
        downstream_leased_asset +
        franchise +
        investment,
    };
  }
}
