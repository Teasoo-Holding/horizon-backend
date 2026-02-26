import { Injectable } from '@nestjs/common';

@Injectable()
export class WaterComputationService {
    async computeFreshwaterWithdrawals(data: any) {
        // step1: Withdrawal sources
        // step2: Produced water
        // step3: Hydraulic fracturing (Yes/No)
        // step4: Disclosure (if Yes)

        // Flattened structure from frontend
        const step1 = data || {};
        const step2 = data || {};
        const step3 = data || {};
        const step4 = data || {};

        const withdrawals = {
            surfaceWater: this.parseValue(step1.withdrawalfromSurfaceWater || step1.withdrawalFromSurfaceWater),
            groundwater: this.parseValue(step1.withdrawalfromGroundwater || step1.withdrawalvalues || step1.withdrawalFromGroundwater),
            municipal: this.parseValue(step1.withdrawalfromMunicipalotherOtherSources || step1.withdrawalFromMunicipal),
            totalConsumed: this.parseValue(step1.totalWaterConsumed),
            waterStressed: this.parseValue(step1.volumeWithdrawnfromWaterStressedRegions || step1.volumeWithdrawnFromWaterStressedRegions),
        };

        const producedWater = {
            generated: this.parseValue(step2.totalProducedWaterGenerated),
            discharged: this.parseValue(step2.volumeDischargedToSurface),
            injected: this.parseValue(step2.volumeInjectedForDisposal),
            recycled: this.parseValue(step2.volumeRecycledReused),
        };

        const fracturing = {
            isOperated: step3.operateHydraulicallyFracturedWells === 'yes',
            totalWells: this.parseValue(step4.totalNumberOfWells),
            totalSites: this.parseValue(step4.totalNumberOfSites),
            sitesWithDeterioratedWaterQuality: this.parseValue(step4.numberOfSitesWithDeterioratedWaterQuality),
            disclosure: step3.operateHydraulicallyFracturedWells === 'yes' ? {
                wellsWithDisclosure: this.parseValue(step4.numberOfWellsWithPublicDisclosure),
                volumeRecycled: this.parseValue(step4.volumeRecycledReused)
            } : null,
            percentageWellsWithDisclosure: step3.operateHydraulicallyFracturedWells === 'yes' && step4.totalNumberOfWells && step4.numberOfWellsWithPublicDisclosure ?
                (Number(step4.numberOfWellsWithPublicDisclosure) / Number(step4.totalNumberOfWells)) * 100 : null
        };

        return {
            withdrawals,
            producedWater,
            fracturing,
            total: 0
        };
    }

    async computeProducedWaterManagement(data: any) {
        const step1 = data || {};
        return {
            totalProducedWater: this.parseValue(step1.totalProducedWater),
            dischargedToSurface: this.parseValue(step1.volumeDischargedToSurface),
            injectedForDisposal: this.parseValue(step1.volumeInjectedForDisposal),
            recycledReused: this.parseValue(step1.volumeRecycledReused),
            averageHydrocarbonContent: step1.averageHydrocarbonContent ?? null,
            averageHydrocarbonContentUnit: step1.averageHydrocarbonContentUnit ?? 'mg/L',
            total: 0
        };
    }

    private parseValue(item: any) {
        if (item === null || item === undefined) return null;
        if (typeof item === 'number' || (typeof item === 'string' && !isNaN(Number(item)))) {
            return {
                volume: Number(item),
                unit: undefined
            };
        }
        return {
            volume: Number(item.volume || 0),
            unit: item.unit
        };
    }
}
