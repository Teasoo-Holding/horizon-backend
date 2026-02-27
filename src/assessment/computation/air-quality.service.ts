import { Injectable } from '@nestjs/common';

@Injectable()
export class AirQualityComputationService {
    async computeAirPollutantEmissions(data: any) {
        const step1 = data || {};

        const metrics = [
            'oxidesOfNitrogen',
            'oxidesOfSulphur',
            'volatileOrganicCompound',
            'particulateMatter'
        ];

        const result: any = {};

        for (const key of metrics) {
            const volume = step1[key];
            const unit = step1[`${key}Unit`];

            if (volume !== undefined && volume !== null && volume !== '') {
                const resultKey = key === 'volatileOrganicCompound' ? 'volatileOrganicCompounds' : key;

                result[resultKey] = {
                    volume: Number(volume),
                    unit: unit
                };
            }
        }

        return {
            breakdown: result,
            total: 0
        };
    }
}
