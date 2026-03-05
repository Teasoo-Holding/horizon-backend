import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTargetData } from './dto/create-target.dto';
import { TargetResponseDto } from './dto/target-response.dto';
import {
  UpdateGeneralTargetData,
  UpdateScopeTargetData,
  UpdateTargetData,
} from './dto/update-target.dto';

interface ComputedTotals {
  totals: any; // replace 'any' with more specific type if you want
}

interface AssessmentData {
  _computed?: ComputedTotals;
  [key: string]: any; // other dynamic fields
}

interface BaselineOption {
  assessmentId: number;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  totalEmission: number;
  hasReport: boolean;
  createdAt: Date;
}
/** Assessments eligible as baselines: approved or auto-approved (pass-through). */
const BASELINE_ELIGIBLE_STATUSES: AssessmentStatus[] = [
  AssessmentStatus.approved,
  AssessmentStatus.submitted_approved,
];

@Injectable()
export class TargetService {
  constructor(private prisma: PrismaService) {}

  /**
   * When baselineAssessmentId is provided, validate the assessment and return its baseline info.
   * Otherwise return null (caller will use getBaselineValue).
   */
  private async validateBaselineAssessment(
    companyId: number,
    assessmentId: number,
  ): Promise<{ startYear: string; totals: number } | null> {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        companyId,
        status: { in: BASELINE_ELIGIBLE_STATUSES },
      },
      select: {
        startYear: true,
        assessmentData: true,
      },
    });

    if (!assessment) {
      return null;
    }

    const data = assessment.assessmentData as AssessmentData | null;
    const totalEmission = data?.totalEmission;
    if (
      typeof totalEmission !== 'number' ||
      !isFinite(totalEmission) ||
      !assessment.startYear
    ) {
      return null;
    }

    return {
      startYear: String(assessment.startYear),
      totals: totalEmission,
    };
  }

  /**
   * Create a new target for a company
   */
  async createTarget(
    companyId: number,
    createdById: number,
    data: CreateTargetData,
  ): Promise<TargetResponseDto> {
    const baselineAssessmentId =
      'baselineAssessmentId' in data ? data.baselineAssessmentId : undefined;

    let baselineData: { startYear?: string; totals: number | null } | null;

    if (baselineAssessmentId != null) {
      const validated = await this.validateBaselineAssessment(
        companyId,
        baselineAssessmentId,
      );
      if (!validated) {
        throw new BadRequestException(
          'The selected baseline assessment was not found or does not have valid emissions data for this company.',
        );
      }
      baselineData = validated;
    } else {
      baselineData = await this.getBaselineValue(companyId);
    }

    if (!baselineData) {
      throw new BadRequestException(
        'You must have at least one approved assessment before setting a target. Submit your GHG assessment for review first.',
      );
    }

    if (!baselineData.startYear || baselineData?.totals === null) {
      throw new BadRequestException(
        'Your assessment must have a valid start year and emissions data before setting a target',
      );
    }

    if (data.targetYear <= data.baselineYear) {
      throw new BadRequestException('Target year must be after baseline year');
    }

    // 🚨 Fetch all existing targets
    const existingTargets = await this.prisma.target.findMany({
      where: { companyId },
      select: {
        id: true,
        baselineYear: true,
        targetYear: true,
        name: true,
      },
    });

    const currentYear = new Date().getFullYear();

    // 🚨 Rule 1: No overlapping ranges
    for (const target of existingTargets) {
      const overlaps =
        data.baselineYear <= target.targetYear &&
        data.targetYear >= target.baselineYear;

      if (overlaps) {
        throw new BadRequestException(
          `A target (${target.name}) already exists covering ${target.baselineYear}–${target.targetYear}. You cannot create overlapping targets.`,
        );
      }
    }

    // 🚨 Rule 2: One target per year
    const duplicateYear = existingTargets.find(
      (t) =>
        t.baselineYear === data.baselineYear &&
        t.targetYear === data.targetYear,
    );

    if (duplicateYear) {
      throw new BadRequestException(
        `A target already exists for year ${data.baselineYear}–${data.targetYear}. Only one target per year is allowed.`,
      );
    }

    // 🚨 Rule 3: No new target if a valid target exists
    const validTarget = existingTargets.find(
      (t) => t.targetYear >= currentYear,
    );
    if (validTarget) {
      throw new BadRequestException(
        `You cannot create a new target while a valid target (${validTarget.name}, ${validTarget.baselineYear}–${validTarget.targetYear}) still exists.`,
      );
    }

    // ✅ Create target if all checks pass
    //    Use server-validated baseline to ensure emission values are authoritative
    if (data.type === 'GENERAL') {
      const serverBaseline = baselineData.totals!;
      data.baselineYearEmission = serverBaseline;
      data.currentEmission = serverBaseline;
      data.targetEmission = serverBaseline * (1 - (data.reductionPercentage ?? 0) / 100);
      return this.createGeneralTarget(companyId, createdById, data);
    } else {
      return this.createScopeTarget(companyId, createdById, data);
    }
  }

  /**
   * Create a general target
   */
  async createGeneralTarget(
    companyId: number,
    createdById: number,
    data: Extract<CreateTargetData, { type: 'GENERAL' }>,
  ): Promise<TargetResponseDto> {
    // Changed to TargetResponseDto
    const target = await this.prisma.target.create({
      data: {
        companyId,
        name: data.name,
        type: 'GENERAL',
        createdById,
        description: data.description ?? '',
        baselineYear: data.baselineYear,
        targetYear: data.targetYear,
        generalTarget: {
          create: {
            reductionPercentage: data.reductionPercentage,
            baselineYearEmission: data.baselineYearEmission,
            targetEmission: data.targetEmission,
            currentEmission: data.currentEmission,
          },
        },
      },
      include: {
        generalTarget: true,
        scopeTargets: true,
      },
    });

    return this.formatTargetResponse(target);
  }

  /**
   * Create a scope-based target
   */
  async createScopeTarget(
    companyId: number,
    createdById: number,
    data: Extract<CreateTargetData, { type: 'SCOPE' }>,
  ): Promise<TargetResponseDto> {
    // Changed to TargetResponseDto
    const target = await this.prisma.target.create({
      data: {
        companyId,
        name: data.name,
        type: 'SCOPE',
        createdById,
        description: data.description ?? '',
        baselineYear: data.baselineYear,
        targetYear: data.targetYear,
        scopeTargets: {
          create: [
            {
              scope: 'SCOPE1',
              reductionPercentage: data.scopes.scope1.reductionPercentage,
              targetEmission: data.scopes.scope1.targetEmission,
              baselineYearEmission: data.scopes.scope1.baselineYearEmission,
              currentEmission: data.scopes.scope1.currentEmission,
            },
            {
              scope: 'SCOPE2',
              reductionPercentage: data.scopes.scope2.reductionPercentage,
              targetEmission: data.scopes.scope2.targetEmission,
              baselineYearEmission: data.scopes.scope2.baselineYearEmission,
              currentEmission: data.scopes.scope2.currentEmission,
            },
            {
              scope: 'SCOPE3',
              reductionPercentage: data.scopes.scope3.reductionPercentage,
              targetEmission: data.scopes.scope3.targetEmission,
              baselineYearEmission: data.scopes.scope3.baselineYearEmission,
              currentEmission: data.scopes.scope3.currentEmission,
            },
          ],
        },
      },
      include: {
        generalTarget: true,
        scopeTargets: true,
      },
    });

    return this.formatTargetResponse(target);
  }

  /**
   * Update a target
   */
  async updateTarget(
    id: number,
    companyId: number,
    data: UpdateTargetData,
  ): Promise<TargetResponseDto> {
    // Changed to TargetResponseDto
    // Check if target exists and belongs to company
    const existingTarget = await this.prisma.target.findFirst({
      where: { id, companyId },
      include: { generalTarget: true, scopeTargets: true },
    });

    if (!existingTarget) {
      throw new NotFoundException('Target not found');
    }

    // Validate timeline if years are being updated
    if (
      data.targetYear &&
      data.baselineYear &&
      data.targetYear <= data.baselineYear
    ) {
      throw new BadRequestException('Target year must be after baseline year');
    }

    // Check for name uniqueness if name is being updated
    if (data.name && data.name !== existingTarget.name) {
      const nameExists = await this.prisma.target.findFirst({
        where: {
          companyId,
          name: data.name,
          id: { not: id },
        },
      });

      if (nameExists) {
        throw new BadRequestException(
          `A target with name "${data.name}" already exists for this company`,
        );
      }
    }

    // Update based on target type
    if (existingTarget.type === 'GENERAL') {
      return this.updateGeneralTarget(id, data as UpdateGeneralTargetData);
    } else {
      return this.updateScopeTarget(id, data as UpdateScopeTargetData);
    }
  }

  /**
   * Update a general target
   */
  private async updateGeneralTarget(
    id: number,
    data: UpdateGeneralTargetData,
  ): Promise<TargetResponseDto> {
    // Changed to TargetResponseDto
    const target = await this.prisma.target.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.baselineYear && { baselineYear: data.baselineYear }),
        ...(data.targetYear && { targetYear: data.targetYear }),
        ...(data.reductionPercentage !== undefined && {
          generalTarget: {
            update: {
              reductionPercentage: data.reductionPercentage,
              ...(data.baselineYearEmission !== undefined && {
                baselineYearEmission: data.baselineYearEmission,
              }),
              ...(data.targetEmission !== undefined && {
                targetEmission: data.targetEmission,
              }),
              ...(data.currentEmission !== undefined && {
                currentEmission: data.currentEmission,
              }),
            },
          },
        }),
      },
      include: {
        generalTarget: true,
        scopeTargets: true,
      },
    });

    return this.formatTargetResponse(target);
  }

  /**
   * Update a scope target
   */
  private async updateScopeTarget(
    id: number,
    data: UpdateScopeTargetData,
  ): Promise<TargetResponseDto> {
    // Changed to TargetResponseDto
    // Build scope updates
    const scopeUpdates: any[] = [];

    if (data.scopes?.scope1?.reductionPercentage !== undefined) {
      scopeUpdates.push(
        this.prisma.scopeTarget.updateMany({
          where: { targetId: id, scope: 'SCOPE1' },
          data: { reductionPercentage: data.scopes.scope1.reductionPercentage },
        }),
      );
    }

    if (data.scopes?.scope2?.reductionPercentage !== undefined) {
      scopeUpdates.push(
        this.prisma.scopeTarget.updateMany({
          where: { targetId: id, scope: 'SCOPE2' },
          data: { reductionPercentage: data.scopes.scope2.reductionPercentage },
        }),
      );
    }

    if (data.scopes?.scope3?.reductionPercentage !== undefined) {
      scopeUpdates.push(
        this.prisma.scopeTarget.updateMany({
          where: { targetId: id, scope: 'SCOPE3' },
          data: { reductionPercentage: data.scopes.scope3.reductionPercentage },
        }),
      );
    }

    // Execute scope updates if any
    if (scopeUpdates.length > 0) {
      await this.prisma.$transaction(scopeUpdates);
    }

    // Update main target
    const target = await this.prisma.target.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.baselineYear && { baselineYear: data.baselineYear }),
        ...(data.targetYear && { targetYear: data.targetYear }),
      },
      include: {
        generalTarget: true,
        scopeTargets: true,
      },
    });

    return this.formatTargetResponse(target);
  }

  /**
   * Delete a target
   */
  async deleteTarget(
    id: number,
    companyId: number,
  ): Promise<{ message: string }> {
    // Check if target exists and belongs to company
    const existingTarget = await this.prisma.target.findFirst({
      where: { id, companyId },
    });

    if (!existingTarget) {
      throw new NotFoundException('Target not found');
    }

    // Delete the target (cascade will handle related records)
    await this.prisma.target.delete({
      where: { id },
    });

    return { message: 'Target deleted successfully' };
  }

  /**
   * Get all targets for a company
   */
  async getCompanyTargets(companyId: number): Promise<TargetResponseDto[]> {
    // Changed to TargetResponseDto[]
    const targets = await this.prisma.target.findMany({
      where: { companyId },
      include: {
        generalTarget: true,
        scopeTargets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // console.log('Fetched targets:', targets);
    return targets.map((target) => this.formatTargetResponse(target));
  }

  async getCompanyLatestTarget(companyId: number): Promise<any> {
    /**
     * 1. Fetch latest valid assessment
     */
    const latestAssessment = await this.prisma.assessment.findFirst({
      where: {
        companyId,
        status: { in: BASELINE_ELIGIBLE_STATUSES },
        startYear: { not: '' },
        endYear: { not: '' },
        startMonth: { not: '' },
        endMonth: { not: '' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestAssessment) {
      return null;
    }

    /**
     * 2. Fetch latest target with relations
     */
    const target = await this.prisma.target.findFirst({
      where: { companyId },
      include: {
        generalTarget: true,
        scopeTargets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!target) {
      return null;
    }

    const baselineAssessment = await this.prisma.assessment.findFirst({
      where: {
        companyId,
        status: { in: BASELINE_ELIGIBLE_STATUSES },
        startYear: String(target.baselineYear),
      },
      orderBy: { createdAt: 'asc' }, // FIRST approved assessment of baseline year
    });

    const baselineScopeTotals = (
      baselineAssessment?.assessmentData as AssessmentData
    )?.environment?.ghg;

    /**
     * 3. Extract assessment data safely
     */
    const assessmentData = latestAssessment.assessmentData as AssessmentData;

    /**
     * 4. Update General Target (if present)
     *    Refresh baseline, current, and target emissions from live assessment data
     *    so the gauge always reflects the actual computed values.
     */
    if (target.generalTarget) {
      const baselineData = baselineAssessment?.assessmentData as AssessmentData;
      const baselineEmission = baselineData?.totalEmission ?? target.generalTarget.baselineYearEmission ?? 0;
      const reductionPct = target.generalTarget.reductionPercentage ?? 0;
      const targetEmission = baselineEmission * (1 - reductionPct / 100);

      await this.prisma.generalTarget.update({
        where: { targetId: target.id },
        data: {
          currentEmission: assessmentData?.totalEmission ?? 0,
          baselineYearEmission: baselineEmission,
          targetEmission: targetEmission,
        },
      });
    }

    /**
     * 5. Prepare scope emissions from assessment
     */
    const scopeTotals = assessmentData?.environment?.ghg;

    const scopeEmissions = [
      {
        scope: 'SCOPE1',
        currentEmission: scopeTotals?.scope1?.totalEmission ?? 0,
        baselineEmission: baselineScopeTotals?.scope1?.totalEmission ?? 0,
      },
      {
        scope: 'SCOPE2',
        currentEmission: scopeTotals?.scope2?.totalEmission ?? 0,
        baselineEmission: baselineScopeTotals?.scope2?.totalEmission ?? 0,
      },
      {
        scope: 'SCOPE3',
        currentEmission: scopeTotals?.scope3?.totalEmission ?? 0,
        baselineEmission: baselineScopeTotals?.scope3?.totalEmission ?? 0,
      },
    ] as const;

    /**
     * 6. Update or create scope targets (safe + atomic)
     *    Always upsert so scope donuts work for both general and scope targets.
     */
    const generalReduction =
      target.generalTarget?.reductionPercentage ?? 0;

    await this.prisma.$transaction(
      scopeEmissions.map((se) =>
        this.prisma.scopeTarget.upsert({
          where: {
            targetId_scope: {
              targetId: target.id,
              scope: se.scope,
            },
          },
          update: {
            currentEmission: se.currentEmission,
            baselineYearEmission: se.baselineEmission,
          },
          create: {
            targetId: target.id,
            scope: se.scope,
            currentEmission: se.currentEmission,
            baselineYearEmission: se.baselineEmission,
            reductionPercentage: generalReduction,
            targetEmission: 0,
          },
        }),
      ),
    );

    /**
     * 7. Return updated target
     */
    const updatedTarget = await this.prisma.target.findFirst({
      where: { companyId },
      include: {
        generalTarget: true,
        scopeTargets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!updatedTarget) {
      throw new NotFoundException('Target not found after update');
    }

    const formatted = this.formatTargetResponse(updatedTarget);
    return {
      ...formatted,
      currentAssessmentYear: latestAssessment.startYear
        ? Number(latestAssessment.startYear)
        : null,
    };
  }
  /**
   * Get a single target
   */
  async getSingleTarget(
    id: number,
    companyId: number,
  ): Promise<TargetResponseDto> {
    // Changed to TargetResponseDto
    const target = await this.prisma.target.findFirst({
      where: { id, companyId },
      include: {
        generalTarget: true,
        scopeTargets: true,
      },
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    return this.formatTargetResponse(target);
  }

  /**
   * Format the target response to match our DTO
   */
  private formatTargetResponse(target: any): TargetResponseDto {
    return {
      id: target.id,
      companyId: target.companyId,
      name: target.name,
      type: target.type,
      createdById: target.createdById,
      description: target.description,
      baselineYear: target.baselineYear,
      targetYear: target.targetYear,
      generalTarget: target.generalTarget
        ? {
            id: target.generalTarget.id,
            reductionPercentage: target.generalTarget.reductionPercentage || 0,
            targetEmission: target.generalTarget.targetEmission || 0,
            baselineYearEmission:
              target.generalTarget.baselineYearEmission || 0,
            currentEmission: target.generalTarget.currentEmission || null,
          }
        : undefined,
      scopeTargets: target.scopeTargets?.map((scope: any) => ({
        id: scope.id,
        scope: scope.scope,
        reductionPercentage: scope.reductionPercentage || 0,
        targetEmission: scope.targetEmission || 0,
        baselineYearEmission: scope.baselineYearEmission || 0,
        currentEmission: scope.currentEmission || null,
      })),
      createdAt: target.createdAt,
      updatedAt: target.updatedAt,
    };
  }

  async getBaselineValue(companyId: number) {
    const baseline = await this.prisma.assessment.findFirst({
      where: {
        companyId,
        status: { in: BASELINE_ELIGIBLE_STATUSES },
        NOT: [
          { startYear: { equals: '' } },
          { startMonth: { equals: '' } },
          { endYear: { equals: '' } },
          { endMonth: { equals: '' } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!baseline) return null;

    const { startYear, endYear, assessmentData } = baseline as any;

    // Extract the total sum if it exists

    const totals = assessmentData?.totalEmission ?? null;

    return {
      startYear,
      endYear,
      totals,
      totalSum: totals,
    };
  }

  async getBaselineValueByScope(companyId: number, assessmentId?: number) {
    let assessmentIdToUse = assessmentId;

    if (!assessmentIdToUse) {
      const baseline = await this.prisma.assessment.findFirst({
        where: {
          companyId,
          status: { in: BASELINE_ELIGIBLE_STATUSES },
          NOT: [
            { startYear: { equals: '' } },
            { startMonth: { equals: '' } },
            { endYear: { equals: '' } },
            { endMonth: { equals: '' } },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!baseline) return null;
      assessmentIdToUse = (baseline as any).id;
    }

    const report = await this.prisma.report.findFirst({
      where: {
        assessmentId: assessmentIdToUse,
      },
      select: {
        ghg_scope_one: true,
        ghg_scope_two: true,
        ghg_scope_three: true,
        ghg_total_emissions: true,
        endYear: true,
        startYear: true,
      },
    });

    return report;
  }

  /**
   * Return a list of baseline-eligible assessments for a company.
   * This is used by the KPI flows to allow users to explicitly choose
   * which assessment period to use as their baseline.
   */
  async getBaselineOptions(companyId: number): Promise<BaselineOption[]> {
    const assessments = await this.prisma.assessment.findMany({
      where: {
        companyId,
        status: { in: BASELINE_ELIGIBLE_STATUSES },
        NOT: [
          { startYear: { equals: '' } },
          { startMonth: { equals: '' } },
          { endYear: { equals: '' } },
          { endMonth: { equals: '' } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        startMonth: true,
        startYear: true,
        endMonth: true,
        endYear: true,
        createdAt: true,
        assessmentData: true,
      },
    });

    if (!assessments.length) {
      return [];
    }

    const assessmentIds = assessments.map((a) => a.id);

    const reports = await this.prisma.report.findMany({
      where: { assessmentId: { in: assessmentIds } },
      select: { assessmentId: true },
    });

    const reportIds = new Set(reports.map((r) => r.assessmentId));

    const options: BaselineOption[] = [];

    for (const a of assessments as any[]) {
      const totalEmission = a.assessmentData?.totalEmission;

      if (typeof totalEmission !== 'number' || !isFinite(totalEmission)) {
        // Skip assessments that do not have a valid total emission value
        continue;
      }

      options.push({
        assessmentId: a.id,
        startMonth: a.startMonth,
        startYear: String(a.startYear),
        endMonth: a.endMonth,
        endYear: String(a.endYear),
        totalEmission,
        hasReport: reportIds.has(a.id),
        createdAt: a.createdAt,
      });
    }

    return options;
  }
}
