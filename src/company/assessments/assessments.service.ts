import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Assessment, AssessmentStatus } from '@prisma/client';
import { ReportService } from '../report/report.service';
import { ActivitiesService } from 'src/activities/activities.service';
import { EmailService } from 'src/email/email.service';
import { AssessmentCalculatorService } from './assessment-calculator.service';

@Injectable()
export class AssessmentService {
  constructor(
    private prisma: PrismaService,
    private calculator: AssessmentCalculatorService,
    private activitiesService: ActivitiesService,
    private reportService: ReportService,
    private emailService: EmailService,
  ) {}

  async createAssessment(
    companyId: number,
    userId: number,
    dto: {
      subsidiary: string;
      startMonth: string;
      startYear: string;
      endMonth: string;
      endYear: string;
    },
  ): Promise<Assessment> {
    try {
      const assessment = await this.prisma.assessment.create({
        data: {
          companyId,
          created_by: userId,
          updated_by: userId,
          status: AssessmentStatus.in_progress,
          subsidiary: dto.subsidiary || 'Self',
          startMonth: dto.startMonth,
          startYear: dto.startYear,
          endMonth: dto.endMonth,
          endYear: dto.endYear,
          assessmentData: { lastSavedForm: null },
        },
      });

      await this.activitiesService.logActivity({
        companyId,
        createdById: userId,
        title: 'New assessment draft created',
        description: `User created assessment #${assessment.id}`,
        type: 'assessment',
        status: 'created',
      });

      return assessment;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Assessment for this period already exists. Continue the existing one or delete it first.',
        );
      }
      throw error;
    }
  }

  async saveProgress(
    companyId: number,
    userId: number,
    assessmentId: number,
    payload: {
      path: string;
      data: any;
      lastSavedForm?: string;
    },
  ): Promise<Assessment> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId, companyId },
    });

    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.status !== AssessmentStatus.in_progress) {
      throw new BadRequestException('Cannot save to submitted assessment');
    }

    const currentData = (assessment.assessmentData || {}) as any;
    const merged = this.deepMerge(currentData, payload.path, payload.data);

    if (payload.lastSavedForm) {
      merged.lastSavedForm = payload.lastSavedForm;
    }

    const { data: recalculated } = await this.calculator.recalculate(merged);

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        assessmentData: recalculated as any,
        updated_by: userId,
      },
      include: { creator: true, updater: true, company: true },
    });

    await this.activitiesService.logActivity({
      companyId,
      createdById: userId,
      title: 'Assessment progress saved',
      description: `Saved form: ${payload.lastSavedForm || 'unknown'}`,
      type: 'assessment',
      status: 'updated',
    });

    return updated;
  }

  async submitGroup(
    companyId: number,
    userId: number,
    assessmentId: number,
    lastSavedForm?: string,
  ): Promise<{
    assessment: Assessment;
    scopeTotals: any;
    progress: any;
    totals: any;
  }> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId, companyId },
      include: { company: true },
    });

    if (!assessment) throw new NotFoundException('Assessment not found');

    const currentData = (assessment.assessmentData || {}) as any;
    if (lastSavedForm) {
      currentData.lastSavedForm = lastSavedForm;
    }

    const result = await this.calculator.recalculate(currentData);
    const recalculated = result.data as any; // ← THIS LINE FIXES THE ERROR
    const scopeTotals = result.scopeTotals;

    const requireReview = assessment.company?.requireAssessmentReview ?? false;
    const newStatus = requireReview
      ? AssessmentStatus.awaiting_review
      : AssessmentStatus.submitted_approved;

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        assessmentData: recalculated as any,
        status: newStatus,
        updated_by: userId,
      },
    });

    await this.activitiesService.logActivity({
      companyId,
      createdById: userId,
      title: 'Assessment group submitted',
      description: `Group completed. Status: ${newStatus}`,
      type: 'assessment',
      status: 'submitted',
    });

    await this.reportService.saveReportingData(assessmentId);

    return {
      assessment: updated,
      scopeTotals,
      progress: recalculated.overallProgress
        ? [{ progress: recalculated.overallProgress }]
        : [],
      totals: recalculated.totals,
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

  async declineAssessment(
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
        status: AssessmentStatus.declined,
        updated_by: currentUserId,
        rejection_reason: rejectionReason,
      },
    });
  }

  private deepMerge(obj: any, path: string, value: any): any {
    const cloned = structuredClone(obj);
    const parts = path.split('.');
    let current = cloned;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    current[parts[parts.length - 1]] = {
      ...current[parts[parts.length - 1]],
      ...value,
    };

    return cloned;
  }
}
