import { Injectable } from '@nestjs/common';

@Injectable()
export class BiodiversityComputationService {
    async computeEnvironmentalManagementPolicies(data: any) {
        const step1 = data?.step1 || {};
        return {
            iso14001Certified: step1.iso14001Certified === 'yes',
            description: step1.description,
            total: 0
        };
    }

    async computeHydrocarbonSpills(data: any) {
        const step2 = data?.step2 || {}; // User said step2
        return {
            numberOfSpills: Number(step2.numberOfSpills?.volume || 0), // Assuming volume field is used for number too, or just value
            totalVolumeSpilled: this.parseValue(step2.totalVolumeSpilled),
            volumeRecovered: this.parseValue(step2.volumeRecoveredFromEnvironment),
            volumeInArctic: this.parseValue(step2.volumeInArctic),
            volumeImpactingSensitiveShorelines: this.parseValue(step2.volumeImpactingSensitiveShorelines),
            total: 0
        };
    }

    async computeReservesInSensitiveAreas(data: any) {
        const step3 = data?.step3 || {};
        return {
            totalProvedReserves: this.parseValue(step3.totalProvedReserves),
            provedReservesInSensitiveAreas: this.parseValue(step3.provedReservesInSensitiveAreas),
            totalProbableReserves: this.parseValue(step3.totalProbableReserves),
            probableReservesInSensitiveAreas: this.parseValue(step3.probableReservesInSensitiveAreas),
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
