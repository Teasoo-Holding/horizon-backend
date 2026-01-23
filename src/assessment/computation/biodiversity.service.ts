import { Injectable } from '@nestjs/common';

@Injectable()
export class BiodiversityComputationService {
    async computeEnvironmentalManagementPolicies(data: any) {
        const step1 = data || {};
        return {
            iso14001Certified: step1.iso14001Certified === 'yes',
            description: step1.description,
            total: 0
        };
    }

    async computeHydrocarbonSpills(data: any) {
        const step2 = data || {}; // Flattened data
        return {
            numberOfSpills: Number(step2.numberOfSpills?.volume || step2.numberOfSpills || 0),
            totalVolumeSpilled: this.parseValue(step2.totalVolumeSpilled),
            volumeRecovered: this.parseValue(step2.volumeRecoveredFromEnvironment || step2.volumeRecovered),
            volumeInArctic: this.parseValue(step2.volumeInArctic),
            volumeImpactingSensitiveShorelines: this.parseValue(step2.volumeImpactingSensitiveShorelines || step2.volumeImpactingShorelines),
            total: 0
        };
    }

    async computeReservesInSensitiveAreas(data: any) {
        const step3 = data || {};
        return {
            totalProvedReserves: this.parseValue(step3.totalProvedReserves),
            provedReservesInSensitiveAreas: this.parseValue(step3.provedReservesInSensitiveAreas),
            totalProbableReserves: this.parseValue(step3.totalProbableReserves),
            probableReservesInSensitiveAreas: this.parseValue(step3.probableReservesInSensitiveAreas),
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
