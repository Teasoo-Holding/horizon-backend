import { Injectable } from '@nestjs/common';

@Injectable()
export class WaterComputationService {
    async computeFreshwaterWithdrawals(data: any) {
        // step1: Withdrawal sources
        // step2: Produced water
        // step3: Hydraulic fracturing (Yes/No)
        // step4: Disclosure (if Yes)

        const step1 = data?.step1 || {};
        const step2 = data?.step2 || {};
        const step3 = data?.step3 || {};
        const step4 = data?.step4 || {};

        const withdrawals = {
            surfaceWater: this.parseValue(step1.withdrawalFromSurfaceWater),
            groundwater: this.parseValue(step1.withdrawalFromGroundwater),
            municipal: this.parseValue(step1.withdrawalFromMunicipal),
            totalConsumed: this.parseValue(step1.totalWaterConsumed),
            waterStressed: this.parseValue(step1.volumeWithdrawnFromWaterStressedRegions),
        };

        const producedWater = {
            generated: this.parseValue(step2.totalProducedWaterGenerated),
            discharged: this.parseValue(step2.volumeDischargedToSurface),
            injected: this.parseValue(step2.volumeInjectedForDisposal),
            recycled: this.parseValue(step2.volumeRecycledReused),
        };

        const fracturing = {
            isOperated: step3.operateHydraulicallyFracturedWells === 'yes',
            disclosure: step3.operateHydraulicallyFracturedWells === 'yes' ? {
                wellsWithDisclosure: this.parseValue(step4.numberOfWellsWithPublicDisclosure),
                volumeRecycled: this.parseValue(step4.volumeRecycledReused)
            } : null
        };

        return {
            withdrawals,
            producedWater,
            fracturing,
            total: 0
        };
    }

    async computeProducedWaterManagement(data: any) {
        const step1 = data?.step1 || {};
        return {
            totalProducedWater: this.parseValue(step1.totalProducedWater),
            dischargedToSurface: this.parseValue(step1.volumeDischargedToSurface),
            injectedForDisposal: this.parseValue(step1.volumeInjectedForDisposal),
            recycledReused: this.parseValue(step1.volumeRecycledReused),
            total: 0
        };
    }

    private parseValue(item: any) {
        if (!item) return null;
        return {
            volume: Number(item.volume || 0),
            unit: item.unit
        };
    }
}
