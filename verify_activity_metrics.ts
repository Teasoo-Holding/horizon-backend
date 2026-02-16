
// Simulation of the patched AssessmentCalculatorService logic for Activity Metrics
class AssessmentCalculatorServiceMock {
    public calculate(data: any) {
        data.environment ??= {};
        data.foundationalData ??= {};

        // Activity Metrics Calc
        if (data.foundationalData?.activityMetrics) {
            const am = data.foundationalData.activityMetrics;

            if (am.productionVolume) { // CHANGED: Singular
                this.calculateFormProgress(am.productionVolume, 4);
            }
            // ... other metrics
        }

        // Foundational Data Progress
        if (data.foundationalData) {
            data.foundationalData.progress = this.calculateFoundationalProgress(data.foundationalData);
        }

        // Overall Progress
        data.overallProgress = this.calculateOverallProgress(data);

        return data;
    }

    private calculateFormProgress(form: any, expected: number = 1) {
        const filledFields = this.countFilledFields(form);
        const count = filledFields;

        form.dataCount = { expected, count };
        const progress = Math.min((count / expected) * 100, 100);
        form.progress = Number(progress.toFixed(1));
    }

    private countFilledFields(obj: any): number {
        let count = 0;
        const ignoredKeys = new Set(['progress', 'dataCount', 'calculated', 'status']);
        for (const key in obj) {
            if (ignoredKeys.has(key)) continue;
            const val = obj[key];
            if (val !== undefined && val !== null) {
                if (typeof val === 'number') count++;
                else if (typeof val === 'string' && val.trim() !== '') count++;
            }
        }
        return count;
    }

    private calculateFoundationalProgress(foundational: any): number {
        const topics: number[] = [];
        if (foundational.activityMetrics) {
            const am = foundational.activityMetrics;
            if (am.productionVolume?.progress != null) { // CHANGED: Singular
                topics.push(am.productionVolume.progress);
            }
        }
        if (topics.length === 0) return 0;
        const sum = topics.reduce((a, b) => a + b, 0);
        return Number((sum / topics.length).toFixed(1));
    }

    private calculateOverallProgress(data: any): number {
        const pillars: number[] = [];
        if (data.foundationalData?.progress != null) {
            pillars.push(data.foundationalData.progress);
        }
        return pillars.length > 0 ? Number((pillars.reduce((sum, p) => sum + p, 0) / pillars.length).toFixed(1)) : 0;
    }
}

const service = new AssessmentCalculatorServiceMock();
const testData = {
    foundationalData: {
        activityMetrics: {
            productionVolume: { // Singular key from user data
                crudeOilProductionVolume: 1213,
                naturalGasProductionVolume: 1311,
                // 2 fields filled out of 4 expected
            }
        }
    }
};

const result = service.calculate(testData);
console.log('Production Volume Progress:', result.foundationalData.activityMetrics.productionVolume.progress + '%');
console.log('Foundational Progress:', result.foundationalData.progress + '%');

// Expected: 
// 2 fields / 4 expected = 50%
