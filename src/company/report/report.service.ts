import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  calculateScope1Total,
  calculateScope2Total,
  extractFuelMixBreakdown,
  getPercentage,
  getTop5ByFuelType,
  // sumScope1Values,
} from './entities/helpers';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaClient) {}

  async findOrganizationAssessmentReport(id: number) {
    const report = await this.prisma.assessment.findMany({
      where: {
        companyId: id,
      },
      select: {
        id: true,
        startMonth: true,
        startYear: true,
        endMonth: true,
        endYear: true,
        subsidiary: true,
        status: true,
      },
    });
    return report;
  }

  async getAssessmentReport(id:number){
    return await this.prisma.report.findUnique({
      where: {id}
    })
  }
async saveReportingData(id: number) {
  const sumSummary = await this.prisma.assessment.findUnique({
    where: { id },
  });

  const report = sumSummary?.assessmentData as any;
  const totals = report?.totals?.totals || {};
  const breakdown = totals?.breakdown || {};

  // Safely get values with fallback
  const ghgScope1 = calculateScope1Total(breakdown)?.total ?? 0;
  const ghgScope2 = calculateScope2Total(breakdown?.scope2)?.total ?? 0;

  const result = {
    ghg_total_emissions: totals?.sum ?? 0,
    ghg_scope_one: ghgScope1,
    ghg_scope_two: ghgScope2,
    ghg_scope_three: 0,
    ghg_datacount_scope_one: 0,
    ghg_datacount_scope_two: 0,
    ghg_datacount_scope_three: 0,
    environmental_total_emissions: 0,
    environmental_scope_one: 0,
    environmental_scope_two: 0,
    environmental_scope_three: 0,
    environmental_datacount_scope_one: 0,
    environmental_datacount_scope_two: 0,
    environmental_datacount_scope_three: 0,
    social_total_emissions: 0,
    social_scope_one: 0,
    social_scope_two: 0,
    social_scope_three: 0,
    social_datacount_scope_one: 0,
    social_datacount_scope_two: 0,
    social_datacount_scope_three: 0,
    governance_total_emissions: 0,
    governance_scope_one: 0,
    governance_scope_two: 0,
    governance_scope_three: 0,
    governance_datacount_scope_one: 0,
    governance_datacount_scope_two: 0,
    governance_datacount_scope_three: 0,
  };

  await this.prisma.report.upsert({
    where: { assessmentId: id },
    update: result,
    create: { assessmentId: id, ...result },
  });

  return { result, totals };
}


  async getReport(id: number, companyId: number) {
    const record = await this.prisma.assessment.findFirst({
      where: { id },
      select: { assessmentData: true },
    });

    if (!record || !record.assessmentData) {
      return []; // or handle no data
    }

    // Prisma’s JsonValue → regular JS object
    const parsedData =
      typeof record.assessmentData === 'string'
        ? JSON.parse(record.assessmentData)
        : record.assessmentData;

    const breakdown = getTop5ByFuelType({ assessmentData: parsedData });

    const report = await this.prisma.report.findUnique({
      where: { assessmentId: id },
    });


    const summary = {
      startMonth: record?.assessmentData,
    }
    const scope1_emission_summary = getPercentage(
      report?.ghg_scope_one ?? 0,
      report?.ghg_total_emissions ?? 0,
    );
    const scope2_emission_summary = getPercentage(
      report?.ghg_scope_two ?? 0,
      report?.ghg_total_emissions ?? 0,
    );
    const scope3_emission_summary = getPercentage(
      report?.ghg_scope_three ?? 0,
      report?.ghg_total_emissions ?? 0,
    );

    if (!record || !record.assessmentData) return [];

    const parsed =
      typeof record.assessmentData === 'string'
        ? JSON.parse(record.assessmentData)
        : record.assessmentData;

    const chartData = extractFuelMixBreakdown(parsed);
    
    const trendData = await this.prisma.assessment.findMany({
      where: { companyId },
      select: {
        startYear: true,
        report: {
          select: {
            ghg_scope_one: true,
            ghg_scope_two: true,
            ghg_scope_three: true,
            ghg_total_emissions: true,
          },
        },
      },
    });

    return {
      report,
      percentage_emission_summary: {
        scope1_emission_summary,
        scope2_emission_summary,
        scope3_emission_summary,
      },
      trendData,
      top_5_sources: {
        breakdown,
      },
      fuel_mix_breakdown: chartData,
      summary
    };
  }
}
