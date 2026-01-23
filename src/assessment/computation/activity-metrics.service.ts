import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityMetricsComputationService {
    async computeProductionVolumes(data: any) {
        const metrics = [
            'crudeOilProduction',
            'naturalGasProduction',
            'syntheticOilProduction',
            'syntheticGasProduction',
        ];
        return this.processMetrics(data, metrics);
    }

    async computeOffshoreSites(data: any) {
        const metrics = [
            'numberOfProductionPlatforms',
            'numberOfFPSOs',
            'numberOfOtherOffshoreSites',
        ];
        return this.processMetrics(data, metrics);
    }

    async computeTerrestrialSites(data: any) {
        const metrics = [
            'numberOfFlowStations',
            'numberOfGasProcessingPlants',
            'numberOfOtherTerrestrialSites',
        ];
        return this.processMetrics(data, metrics);
    }

    private processMetrics(data: any, metrics: string[]) {
        const step1 = data || {};
        const result: any = {};

        for (const key of metrics) {
            const value = step1[key];
            const unit = step1[`${key}Unit`] || step1[`${key}_unit`] || undefined;

            if (value !== undefined && value !== null && value !== '') {
                result[key] = {
                    value: Number(value),
                    unit: unit,
                };
            }
        }

        return {
            breakdown: result,
            total: 0,
        };
    }
}
