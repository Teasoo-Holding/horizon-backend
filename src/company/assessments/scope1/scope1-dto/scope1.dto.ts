import { FuelType } from '@prisma/client';
import { File } from '../../common/file.interface';

export class Scope1Dto {
  id: number;
  ghgDataId: number;
  completed: boolean;
  stationarySources?: {
    id: number;
    scope1DataId: number;
    completed: boolean;
    electricityHeat?: {
      id: number;
      stationarySourcesId: number;
      dieselFuelType?: FuelType | null;
      dieselVolume?: number | null;
      gasFuelType?: FuelType | null;
      gasVolume?: number | null;
      files?: File[] | null;
    } | null | undefined;
    industrialProcesses?: {
      id: number;
      stationarySourcesId: number;
      selectedFuelType: FuelType;
      otherFuelType?: string | null;
      fuelVolume: number;
      files?: File[] | null;
    } | null | undefined;
    oilGasOperations?: {
      id: number;
      stationarySourcesId: number;
      selectedFuelType: FuelType;
      fuelVolume: number;
      files?: File[] | null;
    } | null | undefined;
  } | null | undefined;
  mobileSources?: {
    id: number;
    scope1DataId: number;
    completed: boolean;
    roadTransport?: {
      id: number;
      mobileSourcesId: number;
      dieselTruckFuelType?: FuelType | null;
      dieselTruckVolume?: number | null;
      carPetrolVolume?: number | null;
      carDieselVolume?: number | null;
      files?: File[] | null;
    } | null | undefined;
    vehicleEquipment?: {
      id: number;
      mobileSourcesId: number;
      forkliftFuelType: FuelType;
      forkliftVolume: number;
      heavyDutyFuelType: FuelType;
      heavyDutyVolume: number;
      tractorFuelType: FuelType;
      tractorVolume: number;
      files?: File[] | null;
    } | null | undefined;
    marineAviation?: {
      id: number;
      mobileSourcesId: number;
      helicopterFuelType: FuelType;
      helicopterVolume: number;
      vesselFuelType: FuelType;
      vesselVolume: number;
      otherFuelType?: FuelType | null;
      files?: File[] | null;
    } | null | undefined;
  } | null | undefined;
  processEmissions?: {
    id: number;
    scope1DataId: number;
    completed: boolean;
    co2Release?: {
      id: number;
      processEmissionsId: number;
      clinkerQuantity: number;
      calciumOxide: number;
      magnesiumOxide: number;
      files?: File[] | null;
    } | null | undefined;
    fertilizerEmissions?: {
      id: number;
      processEmissionsId: number;
      products: any;
      feedstock: number;
      files?: File[] | null;
    } | null | undefined;
    gasFlaring?: {
      id: number;
      processEmissionsId: number;
      gasVolume: number;
      carbonContent: number;
      files?: File[] | null;
    } | null | undefined;
    entericFermentation?: {
      id: number;
      processEmissionsId: number;
      animals: any;
      files?: File[] | null;
    } | null | undefined;
    methaneNitrousOxide?: {
      id: number;
      processEmissionsId: number;
      animals: any;
      manureSystem: string;
      otherManureSystem?: string | null;
      files?: File[] | null;
    } | null | undefined;
  } | null | undefined;
  fugitiveEmissions?: {
    id: number;
    scope1DataId: number;
    completed: boolean;
    methaneLeaks?: {
      id: number;
      fugitiveEmissionsId: number;
      compressors: number;
      pumps: number;
      prds: number;
      openEnded: number;
      seals: number;
      wellheads: number;
      manifolds: number;
      hoses: number;
      drains: number;
      sampling: number;
      others: number;
      methanePercent: number;
      files?: File[] | null;
    } | null | undefined;
    ventingNaturalGas?: {
      id: number;
      fugitiveEmissionsId: number;
      volumeOfGasVented: number;
      methane: number;
      carbonDioxide: number;
      ethane: number;
      propane: number;
      butanes: number;
      wellheads: number;
      nitrogen: number;
      hydrogenSulfide: number;
      others: number;
      files?: File[] | null;
    } | null | undefined;
    incompleteCombustion?: {
      id: number;
      fugitiveEmissionsId: number;
      volumeToFlare: number;
      flareEfficiency: number;
      gasComposition: number;
      files?: File[] | null;
    } | null | undefined;
    hfcLeaks?: {
      id: number;
      fugitiveEmissionsId: number;
      R134a: boolean;
      R410A: boolean;
      R404A: boolean;
      R407C: boolean;
      R507A: boolean;
      others: number;
      refrigerantSystem?: string | null;
      refrigerantAdded: number;
      files?: File[] | null;
    } | null | undefined;
  } | null | undefined;
}