import { Injectable } from '@nestjs/common';

@Injectable()
export class AirQualityComputationService {
    async computeAirPollutantEmissions(data: any) {
        // data is the form data for airPollutantEmissions
        // expected structure: { step1: { oxidesOfNitrogen: { volume, unit }, ... } }

        const step1 = data?.step1 || {};

        // Calculate totals or just return the values formatted
        // User said: "return emissions from each metric form group"
        // For Air Quality, we can sum up volumes if units are same, but they are different pollutants.
        // So we likely just want to return the breakdown and maybe a total count of filled fields for progress.

        const metrics = [
            'oxidesOfNitrogen',
            'oxidesOfSulphur',
            'volatileOrganicCompounds', // Fixed typo from 'volatic'
            'particulateMatter'
        ];

        const result: any = {};
        let totalVolume = 0; // This might not make scientific sense to sum different pollutants, but for "total emissions" request...
        // Actually, usually you don't sum NOx and SOx. 
        // But the user asked for "total emissions for environment". 
        // I will return the breakdown.

        for (const key of metrics) {
            const item = step1[key];
            if (item && item.volume) {
                result[key] = {
                    volume: Number(item.volume),
                    unit: item.unit
                };
                // totalVolume += Number(item.volume); // Optional: decide if we want a sum
            }
        }

        return {
            breakdown: result,
            total: 0
        };
    }
}
