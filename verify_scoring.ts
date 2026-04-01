
import { ScoringService } from './src/assessment/scoring/scoring.service';
import { GradingService } from './src/assessment/scoring/grading.service';

const gradingService = new GradingService();
const scoringService = new ScoringService(gradingService);

const mockAssessmentData = {
  activityMetrics: {
    productionVolume: {
      crudeOilProductionVolume: 100, // 100 kbpd
      naturalGasProductionVolume: 600, // 600 mmscfd -> 100 kboe/d
    }
  },
  humanCapital: {
    riskAndOpportunityManagement: {
      healthAndSafetyPerformance: {
        direct: {
          totalHoursWorked: 1000000,
          recordableIncidents: 1,
          nearMisses: 5,
          fatalities: 0
        },
        contract: {
          totalHoursWorked: 1000000,
          recordableIncidents: 1,
          nearMisses: 10,
          fatalities: 0
        }
      }
    }
  },
  socialCapital: {
    communityRelations: {
      hcdtContribution: {
        opexAmount: 10000000,
        hcdtAmount: 500000
      },
      operationalDelays: {
        numberOfDelaysCommunityProtests: 2,
        durationDelaysCommunityProtests: 10,
        numberOfDelaysOtherStakeholder: 3,
        durationDelaysOtherIssues: 25 // Total 35 days -> should trigger veto
      }
    }
  }
};

const mockTotals = {
  ghg_total_emissions: 5000,
};

const result = scoringService.calculateESGScore(mockAssessmentData, mockTotals);

console.log('Overall Score:', result.overallScore);
console.log('Overall Grade:', result.overallGrade);
console.log('Social Pillar Score:', result.pillars.socialCapital.score);
console.log('Human Capital Pillar Score:', result.pillars.humanCapital.score);
console.log('Indicators:', JSON.stringify(result.pillars.socialCapital.indicators, null, 2));
console.log('Human Capital Indicators:', JSON.stringify(result.pillars.humanCapital.indicators, null, 2));

if (result.overallScore <= 60) {
    console.log('Veto successfully applied for > 30 days of delays');
} else {
    console.log('ERROR: Veto NOT applied for > 30 days of delays');
}

const nmfrIndicator = result.pillars.humanCapital.indicators.find(i => i.label === 'Near Miss Frequency Rate (NMFR)');
if (nmfrIndicator) {
    console.log('NMFR Score:', nmfrIndicator.score);
} else {
    console.log('ERROR: NMFR indicator missing');
}

const disruptionIndicator = result.pillars.socialCapital.indicators.find(i => i.label === 'Total Disruption Events');
if (disruptionIndicator) {
    console.log('Disruption Events Score:', disruptionIndicator.score);
} else {
    console.log('ERROR: Disruption Events indicator missing');
}
