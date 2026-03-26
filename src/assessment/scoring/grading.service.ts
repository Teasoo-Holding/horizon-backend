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
    vetouInputs: {
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

    if (vetouInputs.majorSpills > 0) {
      eScore = Math.min(eScore, 40);
      eCapped = true;
    }

    if (vetouInputs.fatalities >= 1) {
      sScore = Math.min(sScore, 50);
      sCapped = true;
    }
    if (vetouInputs.protestDays > 30) {
      sScore = Math.min(sScore, 60);
      sCapped = true;
    }
    if (vetouInputs.hcdtDefiance) {
      sScore = Math.min(sScore, 40);
      sCapped = true;
    }
    if (vetouInputs.humanRightsAbuses) {
      sScore = Math.min(sScore, 30);
      sCapped = true;
    }

    if (vetouInputs.processSafetyEvents >= 2) {
      gScore = Math.min(gScore, 50);
      gCapped = true;
    }
    if (vetouInputs.briberyConviction) {
      gScore = Math.min(gScore, 30);
      gCapped = true;
    }
    if (vetouInputs.licenseSuspension) {
      gScore = Math.min(gScore, 40);
      gCapped = true;
    }

    const overallScore = (eScore * this.weights.E) + (sScore * this.weights.S) + (gScore * this.weights.G);
    const overallGrade = this.calculateGrade(overallScore);

    return {
      pillars: {
        environment: { score: Number(eScore.toFixed(2)), grade: this.calculateGrade(eScore), isCapped: eCapped },
        social: { score: Number(sScore.toFixed(2)), grade: this.calculateGrade(sScore), isCapped: sCapped },
        governance: { score: Number(gScore.toFixed(2)), grade: this.calculateGrade(gScore), isCapped: gCapped },
      },
      overallScore: Number(overallScore.toFixed(2)),
      overallGrade,
    };
  }
}
