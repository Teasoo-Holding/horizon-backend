
// Mock of the AssessmentCalculatorService logic
class AssessmentCalculatorService {
    public calculate(data: any) {
        // Simulate what happens in recalculate
        data.environment ??= {};

        // Calculate Form Progress for Activity Metrics
        if (data.foundationalData?.activityMetrics) {
            const am = data.foundationalData.activityMetrics;
            if (am.productionVolumes) this.calculateFormProgress(am.productionVolumes);
            if (am.offshoreSites) this.calculateFormProgress(am.offshoreSites);
            if (am.terrestrialSites) this.calculateFormProgress(am.terrestrialSites);
        }

        // Foundational Data Progress
        if (data.foundationalData) {
            data.foundationalData.progress = this.calculateFoundationalProgress(data.foundationalData);
        }

        // Overall Progress
        data.overallProgress = this.calculateOverallProgress(data);

        return data;
    }

    private calculateFormProgress(form: any, _expected: number = 1) {
        const filledFields = this.countFilledFields(form);
        const count = filledFields > 0 ? 1 : 0;
        const expected = 1;

        form.dataCount = { expected, count };
        form.progress = count === 1 ? 100 : 0;
    }

    private countFilledFields(obj: any): number {
        let count = 0;
        const ignoredKeys = new Set([
            'progress',
            'dataCount',
            'calculated',
            'status',
            'totalEmission',
            'totalEmissions',
            'breakdown'
        ]);

        for (const key in obj) {
            if (ignoredKeys.has(key)) continue;

            const val = obj[key];
            if (val === undefined || val === null) continue;

            if (Array.isArray(val)) {
                if (val.length > 0) count += 1;
            } else if (typeof val === 'number') {
                count += 1;
            } else if (typeof val === 'string' && val.trim() !== '') {
                count += 1;
            } else if (typeof val === 'boolean') {
                count += 1;
            } else if (typeof val === 'object') {
                if (Object.keys(val).length > 0) count += 1;
            }
        }

        return count;
    }

    private calculateFoundationalProgress(foundational: any): number {
        const topics: number[] = [];

        if (foundational.activityMetrics) {
            const am = foundational.activityMetrics;
            if (am.productionVolumes?.progress != null) {
                topics.push(am.productionVolumes.progress);
            }
            if (am.offshoreSites?.progress != null) {
                topics.push(am.offshoreSites.progress);
            }
            if (am.terrestrialSites?.progress != null) {
                topics.push(am.terrestrialSites.progress);
            }
        }

        if (topics.length === 0) return 0;
        const sum = topics.reduce((a, b) => a + b, 0);
        return Number((sum / topics.length).toFixed(1));
    }

    private calculateEnvironmentalProgress(environment: any): number {
        // Mock: assumes empty environment returns 0
        return 0;
    }

    private calculateOverallProgress(data: any): number {
        const pillars: number[] = [];

        if (data.environment) {
            pillars.push(this.calculateEnvironmentalProgress(data.environment));
        }
        if (data.foundationalData) {
            pillars.push(this.calculateFoundationalProgress(data.foundationalData));
        }
        // ... other pillars omitted for brevity as they are undefined in this test case

        return pillars.length > 0 ? Number((pillars.reduce((sum, p) => sum + p, 0) / pillars.length).toFixed(1)) : 0;
    }
}

// Test Case
const service = new AssessmentCalculatorService();
const testData = {
    foundationalData: {
        activityMetrics: {
            productionVolumes: {
                volume: 1000,
                unit: 'barrels'
            },
            // other forms empty
        }
    }
};

const result = service.calculate(testData);
console.log('Production Volumes Progress:', result.foundationalData.activityMetrics.productionVolumes.progress);
console.log('Foundational Progress:', result.foundationalData.progress);
console.log('Overall Progress:', result.overallProgress);
