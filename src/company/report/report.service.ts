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
  constructor(private prisma: PrismaClient) { }

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
        report: {
          select: {
            progress: true,
          }
        }
      },
    });
    return report.map(r => ({
      ...r,
      progress: r.report?.progress || 0,
      report: undefined // Clean up
    }));
  }

  async getAssessmentReport(id: number) {
    return await this.prisma.report.findUnique({
      where: { id }
    })
  }

  async saveReportingData(id: number) {
    const sumSummary = await this.prisma.assessment.findUnique({
      where: { id },
    });

    const report = sumSummary?.assessmentData as any;
    const ghg = report?.environment?.ghg;

    const result = {
      ghg_total_emissions: report?.totalEmission ?? 0,
      ghg_scope_one: ghg?.scope1?.totalEmission ?? 0,
      ghg_scope_two: ghg?.scope2?.totalEmission ?? 0,
      ghg_scope_three: ghg?.scope3?.totalEmission ?? 0,
      ghg_datacount_scope_one: ghg?.scope1?.dataCount?.count ?? 0,
      ghg_datacount_scope_two: ghg?.scope2?.dataCount?.count ?? 0,
      ghg_datacount_scope_three: ghg?.scope3?.dataCount?.count ?? 0,
      environmental_total_emissions: report?.environment?.totalEmission ?? report?.totalEmission ?? 0,
      environmental_scope_one: ghg?.scope1?.totalEmission ?? 0,
      environmental_scope_two: ghg?.scope2?.totalEmission ?? 0,
      environmental_scope_three: ghg?.scope3?.totalEmission ?? 0,
      environmental_datacount_scope_one: ghg?.scope1?.dataCount?.count ?? 0,
      environmental_datacount_scope_two: 0,
      environmental_datacount_scope_three: ghg?.scope3?.dataCount?.count ?? 0,
      startMonth: sumSummary?.startMonth,
      startYear: sumSummary?.startYear,
      endMonth: sumSummary?.endMonth,
      endYear: sumSummary?.endYear,
      subsidiary: sumSummary?.subsidiary,
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

    const nestedResult = {
      ghg: {
        total: result.ghg_total_emissions,
        scope1: { total: result.ghg_scope_one, dataCount: result.ghg_datacount_scope_one },
        scope2: { total: result.ghg_scope_two, dataCount: result.ghg_datacount_scope_two },
        scope3: { total: result.ghg_scope_three, dataCount: result.ghg_datacount_scope_three },
      },
      environment: {
        total: result.environmental_total_emissions,
        scope1: result.environmental_scope_one,
        scope2: result.environmental_scope_two,
        scope3: result.environmental_scope_three,
      }
    };

    return { result: nestedResult, totals: result };
  }


  async getReport(id: number, companyId: number) {
    const record = await this.prisma.assessment.findFirst({
      where: { id }
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

    // const trendData = await this.prisma.assessment.findMany({
    //   where: { companyId },
    //   select: {
    //     startYear: true,
    //     report: {
    //       select: {
    //         ghg_scope_one: true,
    //         ghg_scope_two: true,
    //         ghg_scope_three: true,
    //         ghg_total_emissions: true,
    //       },
    //     },
    //   },
    // });

    const targets = await this.prisma.target.findMany({
      where: { companyId },
      include: { scopeTargets: true, generalTarget: true }
    });

    const environmentDetails = {
      ghg: {
        total: report?.ghg_total_emissions ?? 0,
        scope1: report?.ghg_scope_one ?? 0,
        scope2: report?.ghg_scope_two ?? 0,
        scope3: report?.ghg_scope_three ?? 0,
      },
      airQuality: parsedData?.environment?.airQuality,
      waterManagement: parsedData?.environment?.waterManagement,
      biodiversityImpact: parsedData?.environment?.biodiversityImpact,
    };

    return {
      report,
      percentage_emission_summary: {
        scope1_emission_summary,
        scope2_emission_summary,
        scope3_emission_summary,
      },
      // trendData,
      status: record.status,
      top_5_sources: {
        breakdown,
      },
      fuel_mix_breakdown: chartData,
      summary,
      environment_details: environmentDetails,
      targets: targets.map(t => ({
        name: t.name,
        type: t.type,
        baselineYear: t.baselineYear,
        targetYear: t.targetYear,
        reductionPercentage: t.generalTarget?.reductionPercentage || t.scopeTargets?.[0]?.reductionPercentage, // Simplified
        baseline: t.generalTarget?.baselineYearEmission || t.scopeTargets?.[0]?.baselineYearEmission,
        current: t.generalTarget?.currentEmission || t.scopeTargets?.[0]?.currentEmission,
        target: t.generalTarget?.targetEmission || t.scopeTargets?.[0]?.targetEmission,
      }))
    };
  }
}
