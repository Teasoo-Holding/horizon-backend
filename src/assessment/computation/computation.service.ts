import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
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

@Injectable()
export class ComputationService {
  constructor(private readonly prisma: PrismaService) {}

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
      dto.fuel_dto,
    );
    const gas_powered_turbine = await this.generalEnergyTypesComputation(
      dto.gas_powered,
    );
    const boilers_and_furnaces_in_manufacturing =
      await this.generalEnergyTypesComputation(dto.boilers_dto);
    const heaters_and_boilers_at_oil_production_facilities =
      await this.generalEnergyTypesComputation(dto.heater_dto);

    return {
      fuel_powered_generator,
      gas_powered_turbine,
      boilers_and_furnaces_in_manufacturing,
      heaters_and_boilers_at_oil_production_facilities,
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
    };
  }

  async processEmission() {
    
  }
}
