import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssessmentPayloadDto } from './dto/assessment.dto';
import { Assessment, AssessmentStatus, Prisma } from '@prisma/client';
import { ComputationFacade } from 'src/assessment/computation/computation.facade';

@Injectable()
export class AssessmentService {
  constructor(
    private prisma: PrismaService,
    private computationFacade: ComputationFacade,
  ) {}

  private getAssessmentDataPayload(data: AssessmentPayloadDto) {
    const {
      subsidiary,
      startMonth,
      startYear,
      endMonth,
      endYear,
      stationarySources,
      mobileSources,
      processEmissions,
      fugitiveEmissions,
      ...rest
    } = data;
    return {
      subsidiary,
      startMonth,
      startYear,
      endMonth,
      endYear,
      stationarySources,
      mobileSources,
      processEmissions,
      fugitiveEmissions,
      ...rest,
    };
  }

  async getAssessments(companyId: number): Promise<Assessment[]> {
    return this.prisma.assessment.findMany({
      where: { companyId },
    });
  }

  async getAssessment(
    companyId: number,
    assessmentId: number,
  ): Promise<Assessment | null> {
    return this.prisma.assessment.findUnique({
      where: { id: assessmentId, companyId },
    });
  }

  async createAssessment(
    companyId: number,
    currentUserId: number,
  ): Promise<Assessment> {
    return this.prisma.assessment.create({
      data: {
        companyId,
        created_by: currentUserId,
        updated_by: currentUserId,
        status: AssessmentStatus.draft,
        subsidiary: '',
        startMonth: '',
        startYear: '',
        endMonth: '',
        endYear: '',
        assessmentData: {},
      },
    });
  }

  async saveAssessment(
    companyId: number,
    currentUserId: number,
    assessmentId: number, // Now a number
    data: AssessmentPayloadDto,
  ): Promise<Assessment> {
    const assessmentData = this.getAssessmentDataPayload(data);

    return this.prisma.assessment.update({
      where: { id: assessmentId, companyId },
      data: {
        updated_by: currentUserId,
        subsidiary: data.subsidiary,
        startMonth: data.startMonth,
        startYear: data.startYear,
        endMonth: data.endMonth,
        endYear: data.endYear,
        assessmentData: assessmentData,
      },
    });
  }

  async submitAssessment(
    companyId: number,
    currentUserId: number,
    assessmentId: number,
    data: Prisma.JsonValue,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new Error(`Assessment with ID ${assessmentId} not found`);
    }

    const submitted = data;
    const computedAt = new Date();

    let totals: any = null;
    let error: string | null = null;

    try {
      totals = await this.computationFacade.computeAssessmentTotals(
        submitted as any,
      );
    } catch (err) {
      console.error('Computation error:', err);
      error = (err as Error).message;
    }

    const flattenedTotals = totals
      ? {
          ...totals,
          computedAt,
        }
      : null;

    const newAssessmentData: Prisma.JsonObject = {
      ...(typeof submitted === 'object' && submitted !== null
        ? (submitted as Prisma.JsonObject)
        : { original: submitted as Prisma.JsonValue }),
      totals: flattenedTotals ?? Prisma.JsonNull,
      totalsComputedAt: computedAt.toISOString(),
      totalsError: error ?? null,
    };

    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        companyId,
        subsidiary: (data as any).subsidiary ?? assessment.subsidiary,
        startMonth: (data as any).startMonth ?? assessment.startMonth,
        startYear: (data as any).startYear ?? assessment.startYear,
        endMonth: (data as any).endMonth ?? assessment.endMonth,
        endYear: (data as any).endYear ?? assessment.endYear,

        assessmentData: newAssessmentData,
        status: 'submitted',
        updated_by: currentUserId,
      },
    });
  }
}
