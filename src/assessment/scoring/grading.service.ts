import { Injectable } from '@nestjs/common';

export interface ScoreDetails {
  score: number;
  grade: string;
  isCapped: boolean;
}

@Injectable()
export class GradingService {
  private weights = {
    E: 0.41,
    S: 0.26,
    G: 0.33,
  };

  setWeights(eWeight: number, sWeight: number, gWeight: number) {
    this.weights = { E: eWeight, S: sWeight, G: gWeight };
  }

  calculateGrade(score: number): string {
    if (score >= 85.71) return 'AAA';
    if (score >= 71.43) return 'AA';
    if (score >= 57.14) return 'A';
    if (score >= 42.86) return 'BBB';
    if (score >= 28.57) return 'BB';
    if (score >= 14.29) return 'B';
    return 'CCC';
  }

  aggregate(
    envScores: number[],
    socScores: number[],
    govScores: number[],
    vetoInputs: {
      fatalities: number;
      majorSpills: number;
      processSafetyEvents: number;
      protestDays: number;
      briberyConviction?: boolean;
      hcdtDefiance?: boolean;
      licenseSuspension?: boolean;
      humanRightsAbuses?: boolean;
    }
  ) {
    const avg = (arr: number[]) => {
      const valid = arr.filter(n => typeof n === 'number' && !isNaN(n));
      if (!valid.length) return 0;
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    };

    let eScore = avg(envScores);
    let sScore = avg(socScores);
    let gScore = avg(govScores);

    let eCapped = false, sCapped = false, gCapped = false;
    if (vetoInputs.majorSpills > 0) { eScore = Math.min(eScore, 40); eCapped = true; }
    if (vetoInputs.fatalities >= 1) { sScore = Math.min(sScore, 50); sCapped = true; }
    if (vetoInputs.protestDays > 30) { sScore = Math.min(sScore, 60); sCapped = true; }
    if (vetoInputs.hcdtDefiance) { sScore = Math.min(sScore, 40); sCapped = true; }
    if (vetoInputs.humanRightsAbuses) { sScore = Math.min(sScore, 30); sCapped = true; }
    if (vetoInputs.processSafetyEvents >= 2) { gScore = Math.min(gScore, 50); gCapped = true; }
    if (vetoInputs.briberyConviction) { gScore = Math.min(gScore, 30); gCapped = true; }
    if (vetoInputs.licenseSuspension) { gScore = Math.min(gScore, 40); gCapped = true; }

    const socialCapScore = avg(socScores.slice(0, 4));
    const humanCapScore = socScores[4] ?? 0;
    const leadershipScore = avg([govScores[0], govScores[4]]);
    const businessModelScore = avg(govScores.slice(1, 4));

    const overallScore = (eScore * this.weights.E) + (sScore * this.weights.S) + (gScore * this.weights.G);
    const overallGrade = this.calculateGrade(overallScore);

    return {
      pillars: {
        environment: { score: Number(eScore.toFixed(2)), grade: this.calculateGrade(eScore), isCapped: eCapped },
        social: { score: Number(sScore.toFixed(2)), grade: this.calculateGrade(sScore), isCapped: sCapped },
        governance: { score: Number(gScore.toFixed(2)), grade: this.calculateGrade(gScore), isCapped: gCapped },
        
        environmental: { score: Number(eScore.toFixed(2)), grade: this.calculateGrade(eScore) },
        socialCapital: { score: Number(socialCapScore.toFixed(2)), grade: this.calculateGrade(socialCapScore) },
        humanCapital: { score: Number(humanCapScore.toFixed(2)), grade: this.calculateGrade(humanCapScore) },
        businessModel: { score: Number(businessModelScore.toFixed(2)), grade: this.calculateGrade(businessModelScore) },
        leadership: { score: Number(leadershipScore.toFixed(2)), grade: this.calculateGrade(leadershipScore) },
      },
      overallScore: Number(overallScore.toFixed(2)),
      overallGrade,
    };
  }
}
