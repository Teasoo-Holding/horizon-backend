import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssessmentPayloadDto } from './dto/assessment.dto';
import { Assessment, AssessmentStatus } from '@prisma/client';
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
      ...rest
    } = data;
    return {
      subsidiary,
      startMonth,
      startYear,
      endMonth,
      endYear,
      stationarySources,
      ...rest,
    };
  }

  async getAssessments(companyId: number): Promise<Assessment[]> {
    return this.prisma.assessment.findMany({
      where: { companyId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAssessmentById(
    companyId: number,
    assessmentId: number,
  ): Promise<Assessment | null> {
    return this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        companyId,
      },
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
    data: AssessmentPayloadDto,
  ): Promise<{ assessment: Assessment; totals: any }> {
    // Save latest changes first
    const assessment = await this.saveAssessment(
      companyId,
      currentUserId,
      assessmentId,
      data,
    );

    // Mark as submitted
    const submitted = await this.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: AssessmentStatus.submitted,
      },
    });

    // Compute totals after final state
    const totals = await this.computationFacade.computeAssessmentTotals(
      submitted.assessmentData,
    );

    // Return both
    return { assessment: submitted, totals };
  }

  // async submitAssessment(
  //   companyId: number,
  //   currentUserId: number,
  //   assessmentId: number,
  //   data: AssessmentPayloadDto,
  // ): Promise<Assessment> {
  //   const assessment = await this.saveAssessment(
  //     companyId,
  //     currentUserId,
  //     assessmentId,
  //     data,
  //   );

  //   const submitted = await this.prisma.assessment.update({
  //     where: { id: assessment.id },
  //     data: {
  //       status: AssessmentStatus.submitted,
  //     },
  //   });

  //   const totals = await this.computationFacade.computeAssessmentTotals(
  //     submitted.assessmentData,
  //   );

  //   // return this.prisma.assessment.update({
  //   //   where: { id: assessment.id },
  //   //   data: {
  //   //     status: AssessmentStatus.submitted,
  //   //   },
  //   // });

  //   return { assessment: submitted, totals };
  // }
}
