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
    private emailService: EmailService,
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

  private async upsertAssessment(
    companyId: number,
    currentUserId: number,
    assessmentId: number | null,
    data: AssessmentPayloadDto,
    status: AssessmentStatus,
    computedData?: Prisma.JsonObject,
  ): Promise<Assessment> {
    const assessmentDataPayload = this.getAssessmentDataPayload(data);
    const progress = (data as any).progress || {};

    const existing = assessmentId
      ? await this.prisma.assessment.findUnique({
          where: { id: assessmentId },
          select: { assessmentData: true },
        })
      : null;

    const existingComputed =
      (existing?.assessmentData as any)?.__computed ?? {};

    const mergedComputed =
      computedData && (computedData as any).__computed
        ? (computedData as any).__computed
        : {
            ...existingComputed,
            progress,
          };

    const baseAssessmentData = {
      ...assessmentDataPayload,
      __computed: mergedComputed,
    };

    const baseData = {
      subsidiary: data.subsidiary,
      startMonth: data.startMonth,
      startYear: data.startYear,
      endMonth: data.endMonth,
      endYear: data.endYear,
      assessmentData: computedData || baseAssessmentData,
      status,
      updated_by: currentUserId,
    };

    if (assessmentId) {
      return this.prisma.assessment.update({
        where: { id: assessmentId, companyId },
        data: baseData,
      });
    }

    return this.prisma.assessment.create({
      data: {
        companyId,
        created_by: currentUserId,
        ...baseData,
      },
    });
  }

  async saveAssessment(
    companyId: number,
    currentUserId: number,
    assessmentId: number | null,
    data: AssessmentPayloadDto,
  ): Promise<Assessment> {
    const isNew = assessmentId === null;

    const assessment = await this.upsertAssessment(
      companyId,
      currentUserId,
      assessmentId,
      data,
      AssessmentStatus.in_progress,
    );

    const logId = assessment.id;

    await this.activitiesService.logActivity({
      companyId,
      createdById: currentUserId,
      title: isNew ? `New assessment draft created` : `Saved assessment`,
      description: isNew
        ? `User created a new draft assessment #${logId}.`
        : `User saved updates to assessment #${logId}.`,
      type: 'assessment',
      status: isNew ? 'created' : 'updated',
    });

    await this.reportService.saveReportingData(logId);
    return assessment;
  }

  async submitAssessment(
    companyId: number,
    currentUserId: number,
    assessmentId: number | null,
    data: AssessmentPayloadDto,
  ): Promise<{
    assessment: Assessment;
    scopeTotals: any;
    progress: any;
    totals: any;
  }> {
    const isNew = assessmentId === null;

    const tempAssessment = isNew
      ? ({ company: { requireAssessmentReview: false } } as any)
      : await this.prisma.assessment.findUnique({
          where: { id: assessmentId! },
          include: { company: true },
        });

    if (!tempAssessment && !isNew) {
      throw new NotFoundException(
        `Assessment with ID ${assessmentId} not found.`,
      );
    }

    const requireReview =
      tempAssessment.company?.requireAssessmentReview ?? false;
    const statusToSet = requireReview
      ? AssessmentStatus.awaiting_review
      : AssessmentStatus.submitted_approved;

    const submitted = data;

    let totals: any = null;
    let scopeTotals: any = { scope1: 0, scope2: 0, scope3: 0, total: 0 };
    const progress: any = (submitted as any).progress || {};

    try {
      totals = await this.computationFacade.computeAssessmentTotals(
        submitted as any,
      );

      scopeTotals = totals.scopeTotals;
    } catch (err) {
      console.error('Computation error:', err);
    }

    const newAssessmentData: Prisma.JsonObject = {
      ...(submitted as unknown as Prisma.JsonObject),

      __computed: {
        totals: totals.totals ?? null,
        scopeTotals: totals.scopeTotals,
        progress: totals.progress || progress,
        computedAt: totals.computedAt,
        error: totals.error ?? null,
      },
    };

    const submittedAssessment = await this.upsertAssessment(
      companyId,
      currentUserId,
      assessmentId,
      data,
      statusToSet,
      newAssessmentData,
    );

    const user = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { first_name: true },
    });
    const userName = user?.first_name ?? 'Company User';

    const logId = submittedAssessment.id;

    await this.activitiesService.logActivity({
      companyId,
      createdById: currentUserId,
      title: `Submitted assessment (ID: ${logId})`,
      description: `${userName} submitted assessment ${logId} for computation.`,
      type: 'assessment',
      status: 'submitted',
    });

    await this.reportService.saveReportingData(logId);

    return {
      assessment: submittedAssessment,
      scopeTotals: scopeTotals,
      progress: progress,
      totals: totals,
    };
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
            name: true,
          },
        },
        creator: {
          select: {
            email: true,
            first_name: true,
          },
        },
      },
    });
    const creatorEmail = assessmentWithCreator?.creator?.email;
    const first_name = assessmentWithCreator?.creator?.first_name || '';
    const company_name = assessmentWithCreator?.company?.name || '';
    if (!creatorEmail)
      throw new Error('Creator email not found for this assessment');

    await this.emailService.sendEmail(
      creatorEmail,
      { first_name, company_name, reason: rejectionReason },
      17,
    );
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
