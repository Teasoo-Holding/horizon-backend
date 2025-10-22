import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssessmentPayloadDto } from './dto/assessment.dto';
import { Assessment, AssessmentStatus, Prisma } from '@prisma/client';
import { ComputationFacade } from 'src/assessment/computation/computation.facade';
import { ReportService } from '../report/report.service';
import { ActivitiesService } from 'src/activities/activities.service';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AssessmentService {
  constructor(
    private prisma: PrismaService,
    private computationFacade: ComputationFacade,
    private reportService: ReportService,
    private activitiesService: ActivitiesService,
    private emailService: EmailService
  ) { }

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
      orderBy: {
        createdAt: 'desc',
      },
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
        status: AssessmentStatus.in_progress,
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
    assessmentId: number,
    data: AssessmentPayloadDto,
  ): Promise<Assessment> {
    const assessmentData = this.getAssessmentDataPayload(data);

    const updated = await this.prisma.assessment.update({
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

    await this.activitiesService.logActivity({
      companyId,
      createdById: currentUserId,
      title: `Saved assessment`,
      description: `User saved updates to assessment #${assessmentId}.`,
      type: 'assessment',
      status: 'updated',
    });

    await this.reportService.saveReportingData(assessmentId);
    return updated;
  }

  async submitAssessment(
    companyId: number,
    currentUserId: number,
    assessmentId: number,
    data: Prisma.JsonValue,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { company: true },
    });

    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID ${assessmentId} not found`,
      );
    }

    const requireReview = assessment.company?.requireAssessmentReview ?? false;
    const statusToSet = requireReview
      ? AssessmentStatus.awaiting_review
      : AssessmentStatus.submitted_approved;

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

    const flattenedTotals = totals ? { ...totals, computedAt } : null;

    const newAssessmentData: Prisma.JsonObject = {
      ...(typeof submitted === 'object' && submitted !== null
        ? (submitted as Prisma.JsonObject)
        : { original: submitted as Prisma.JsonValue }),
      totals: flattenedTotals ?? Prisma.JsonNull,
      totalsComputedAt: computedAt.toISOString(),
      totalsError: error ?? null,
    };

    const submittedAssessment = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        companyId,
        subsidiary: (data as any).subsidiary ?? assessment.subsidiary,
        startMonth: (data as any).startMonth ?? assessment.startMonth,
        startYear: (data as any).startYear ?? assessment.startYear,
        endMonth: (data as any).endMonth ?? assessment.endMonth,
        endYear: (data as any).endYear ?? assessment.endYear,
        assessmentData: newAssessmentData,
        status: statusToSet,
        updated_by: currentUserId,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { first_name: true },
    });
    const userName = user?.first_name ?? 'Company User';

    await this.activitiesService.logActivity({
      companyId,
      createdById: currentUserId,
      title: `Submitted assessment (ID: ${assessmentId})`,
      description: `${userName} submitted assessment ${assessmentId} for computation.`,
      type: 'assessment',
      status: 'submitted',
    });

    await this.reportService.saveReportingData(assessmentId);
    return submittedAssessment;
  }

  async deleteAssessment(
    companyId: number,
    assessmentId: number,
  ): Promise<void> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId, companyId },
      select: { status: true, created_by: true },
    });

    if (!assessment) {
      throw new Error('AssessmentNotFound');
    }

    if (assessment.status !== AssessmentStatus.in_progress) {
      throw new Error('AssessmentNotDraft');
    }

    // await this.prisma.report.deleteMany({
    //   where: { assessmentId: assessmentId },
    // });
    // or use onDelete: Cascade in relations in the report service

    await this.prisma.assessment.delete({
      where: { id: assessmentId },
    });

    await this.activitiesService.logActivity({
      companyId,
      createdById: assessment.created_by!,
      title: `Deleted draft assessment`,
      description: `Draft assessment ${assessmentId} deleted.`,
      type: 'assessment',
      status: 'deleted',
    });
  }

  async approveAssessment(
    companyId: number,
    currentUserId: number,
    assessmentId: number,
  ): Promise<Assessment> {
    return this.prisma.assessment.update({
      where: { id: assessmentId, companyId },
      data: {
        status: AssessmentStatus.approved,
        updated_by: currentUserId,
        rejection_reason: null,
      },
    });
  }

  async rejectAssessment(
    companyId: number,
    currentUserId: number,
    assessmentId: number,
    rejectionReason: string,
  ): Promise<Assessment> {
    const assessmentWithCreator = await this.prisma.assessment.findFirst({
      where: { id: assessmentId },
      select: {
        company: {
          select: {
            name: true
          }
        },
        creator: {
          select: {
            email: true,
            first_name: true
          }
        }
      }
    })
    const creatorEmail = assessmentWithCreator?.creator?.email;
    const first_name = assessmentWithCreator?.creator?.first_name || '';
    const company_name = assessmentWithCreator?.company?.name || '';
    if (!creatorEmail) throw new Error('Creator email not found for this assessment');
    
    await this.emailService.sendEmail(creatorEmail, { first_name, company_name, reason: rejectionReason }, 17);
    return this.prisma.assessment.update({
      where: { id: assessmentId, companyId },
      data: {
        status: AssessmentStatus.unapproved_rejected,
        updated_by: currentUserId,
        rejection_reason: rejectionReason,
      },
    });
  }
}
