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
import {
  AssessmentForCompute,
  ComputedTargetEmissions,
  computeTargetEmissions,
} from './utils/computeEmissions';

interface BaselineOption {
  assessmentId: number;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  totalEmission: number;
  hasReport: boolean;
  createdAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
}

/** Assessments eligible as baselines: approved or auto-approved (pass-through). */
const BASELINE_ELIGIBLE_STATUSES: AssessmentStatus[] = [
  AssessmentStatus.approved,
  AssessmentStatus.submitted_approved,
];

const ASSESSMENT_FOR_COMPUTE_SELECT = {
  id: true,
  startYear: true,
  assessmentData: true,
  approvedAt: true,
  submittedAt: true,
  updatedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class TargetService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────── shared helpers ───────────────────────────

  /**
   * Fetch every approved assessment for a company in the lean shape required
   * by computeTargetEmissions. One query feeds N target computations — no
   * per-target DB roundtrips.
   */
  private async fetchAssessmentsForCompute(
    companyId: number,
  ): Promise<AssessmentForCompute[]> {
    return this.prisma.assessment.findMany({
      where: {
        companyId,
        status: { in: BASELINE_ELIGIBLE_STATUSES },
        startYear: { not: '' },
        endYear: { not: '' },
        startMonth: { not: '' },
        endMonth: { not: '' },
      },
      orderBy: { createdAt: 'desc' },
      select: ASSESSMENT_FOR_COMPUTE_SELECT,
    });
  }

  /**
   * Build the API response DTO from a stored target row + computed emissions.
   * Replaces the old `formatTargetResponse` — emission fields are sourced
   * from `computed`, not from the DB columns (which we no longer write).
   */
  private decorateTargetResponse(
    target: any,
    computed: ComputedTargetEmissions,
  ): TargetResponseDto {
    return {
      id: target.id,
      companyId: target.companyId,
      name: target.name,
      type: target.type,
      createdById: target.createdById,
      description: target.description,
      baselineYear: target.baselineYear,
      targetYear: target.targetYear,
      currentAssessmentYear: computed.currentAssessmentYear,
      generalTarget:
        target.generalTarget && computed.general
          ? {
              id: target.generalTarget.id,
              reductionPercentage:
                target.generalTarget.reductionPercentage || 0,
              baselineYearEmission:
                computed.general.baselineYearEmission ?? 0,
              targetEmission: computed.general.targetEmission ?? 0,
              currentEmission: computed.general.currentEmission,
            }
          : undefined,
      // Older code paths used to upsert Scope 1/2/3 rows under every target
      // (including GENERAL ones) to feed an old donut chart. Those writes are
      // gone now, but the stale rows can still be in the DB. A GENERAL target
      // has no scope semantics, so we strip them from the response — keeps
      // the chart honest regardless of DB state.
      scopeTargets:
        target.type === 'GENERAL'
          ? []
          : target.scopeTargets?.map((st: any) => {
              const computedScope = computed.scopes.find(
                (c) => c.scope === st.scope,
              );
              return {
                id: st.id,
                scope: st.scope,
                reductionPercentage: st.reductionPercentage || 0,
                baselineYearEmission:
                  computedScope?.figures.baselineYearEmission ?? 0,
                targetEmission: computedScope?.figures.targetEmission ?? 0,
                currentEmission: computedScope?.figures.currentEmission ?? null,
                baselineYear: st.baselineYear ?? null,
                targetYear: st.targetYear ?? null,
              };
            }),
      createdAt: target.createdAt,
      updatedAt: target.updatedAt,
    };
  }

  // ─────────────────────────── create / update / delete ───────────────────────────

  /**
   * Validate that a baseline-eligible assessment exists for the requested
   * baseline year. Returns the assessment's totalEmission so create-time
   * snapshot fields can be set, even though they're no longer read at
   * runtime (we recompute from assessments on every read).
   */
  private async resolveBaselineForYear(
    companyId: number,
    baselineYear: number,
  ): Promise<{ totalEmission: number | null } | null> {
    const baseline = await this.prisma.assessment.findFirst({
      where: {
        companyId,
        status: { in: BASELINE_ELIGIBLE_STATUSES },
        startYear: String(baselineYear),
        NOT: [
          { startMonth: { equals: '' } },
          { endYear: { equals: '' } },
          { endMonth: { equals: '' } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { assessmentData: true },
    });
    if (!baseline) return null;
    const data = baseline.assessmentData as { totalEmission?: number } | null;
    const v = data?.totalEmission;
    return {
      totalEmission:
        typeof v === 'number' && Number.isFinite(v) ? v : null,
    };
  }

  private async validateExplicitBaselineAssessment(
    companyId: number,
    assessmentId: number,
    baselineYear: number,
  ): Promise<{ totalEmission: number | null } | null> {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        companyId,
        status: { in: BASELINE_ELIGIBLE_STATUSES },
      },
      select: { startYear: true, assessmentData: true },
    });
    if (!assessment) return null;
    if (Number(assessment.startYear) !== baselineYear) return null;
    const data = assessment.assessmentData as { totalEmission?: number } | null;
    const v = data?.totalEmission;
    return {
      totalEmission:
        typeof v === 'number' && Number.isFinite(v) ? v : null,
    };
  }

  /**
   * Create a new target for a company.
   *
   * Baseline lookup matches by year (or by explicit baselineAssessmentId),
   * never "the latest assessment". The snapshot emission columns are still
   * persisted for create-time bookkeeping, but reads always recompute from
   * the assessment data — so any drift here is harmless.
   */
  async createTarget(
    companyId: number,
    createdById: number,
    data: CreateTargetData,
  ): Promise<TargetResponseDto> {
    if (data.targetYear <= data.baselineYear) {
      throw new BadRequestException('Target year must be after baseline year');
    }

    const baselineAssessmentId =
      'baselineAssessmentId' in data ? data.baselineAssessmentId : undefined;

    let baselineSnapshot: { totalEmission: number | null } | null;
    if (baselineAssessmentId != null) {
      baselineSnapshot = await this.validateExplicitBaselineAssessment(
        companyId,
        baselineAssessmentId,
        data.baselineYear,
      );
      if (!baselineSnapshot) {
        throw new BadRequestException(
          `The selected baseline assessment is not approved or does not match baseline year ${data.baselineYear}.`,
        );
      }
    } else {
      baselineSnapshot = await this.resolveBaselineForYear(
        companyId,
        data.baselineYear,
      );
      if (!baselineSnapshot) {
        throw new BadRequestException(
          `No approved assessment exists for baseline year ${data.baselineYear}. Submit and approve one before setting a target.`,
        );
      }
    }

    if (baselineSnapshot.totalEmission == null) {
      throw new BadRequestException(
        'The baseline assessment has no computed total emissions. Recompute the assessment before setting a target.',
      );
    }

    if (data.name) {
      const nameExists = await this.prisma.target.findFirst({
        where: { companyId, name: data.name },
        select: { id: true },
      });
      if (nameExists) {
        throw new BadRequestException(
          `A target named "${data.name}" already exists for this company. Pick a different name or edit the existing one.`,
        );
      }
    }

    // Overlap / duplicate / active-target rules
    const existingTargets = await this.prisma.target.findMany({
      where: { companyId },
      select: {
        id: true,
        baselineYear: true,
        targetYear: true,
        name: true,
        type: true,
      },
    });

    const currentYear = new Date().getFullYear();
    const sameTypeTargets = existingTargets.filter((t) => t.type === data.type);

    for (const target of sameTypeTargets) {
      const overlaps =
        data.baselineYear <= target.targetYear &&
        data.targetYear >= target.baselineYear;
      if (overlaps) {
        throw new BadRequestException(
          `A ${data.type} target (${target.name}) already exists covering ${target.baselineYear}–${target.targetYear}. You cannot create overlapping targets.`,
        );
      }
    }

    const duplicateYear = sameTypeTargets.find(
      (t) =>
        t.baselineYear === data.baselineYear &&
        t.targetYear === data.targetYear,
    );
    if (duplicateYear) {
      throw new BadRequestException(
        `A ${data.type} target already exists for ${data.baselineYear}–${data.targetYear}. Only one target per type per year range is allowed.`,
      );
    }

    const validTarget = sameTypeTargets.find(
      (t) => t.targetYear >= currentYear,
    );
    if (validTarget) {
      throw new BadRequestException(
        `You already have an active ${data.type} target (${validTarget.name}, ${validTarget.baselineYear}–${validTarget.targetYear}). Please edit it instead.`,
      );
    }

    if (data.type === 'GENERAL') {
      const baseline = baselineSnapshot.totalEmission;
      data.baselineYearEmission = baseline;
      data.currentEmission = baseline;
      data.targetEmission =
        baseline * (1 - (data.reductionPercentage ?? 0) / 100);
      return this.createGeneralTarget(companyId, createdById, data);
    }

    const scopeData = data as Extract<CreateTargetData, { type: 'SCOPE' }>;
    const scopeYears = [
      scopeData.scopes.scope1,
      scopeData.scopes.scope2,
      scopeData.scopes.scope3,
    ];
    const perScopeBaselineYears = scopeYears
      .map((s) => s.baselineYear)
      .filter((y): y is number => y != null);
    const perScopeTargetYears = scopeYears
      .map((s) => s.targetYear)
      .filter((y): y is number => y != null);
    if (perScopeBaselineYears.length > 0) {
      scopeData.baselineYear = Math.min(...perScopeBaselineYears);
    }
    if (perScopeTargetYears.length > 0) {
      scopeData.targetYear = Math.max(...perScopeTargetYears);
    }
    return this.createScopeTarget(companyId, createdById, scopeData);
  }

  async createGeneralTarget(
    companyId: number,
    createdById: number,
    data: Extract<CreateTargetData, { type: 'GENERAL' }>,
  ): Promise<TargetResponseDto> {
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
            baselineYearEmission: data.baselineYearEmission ?? 0,
            targetEmission: data.targetEmission ?? 0,
            currentEmission: data.currentEmission,
          },
        },
      },
      include: { generalTarget: true, scopeTargets: true },
    });

    const assessments = await this.fetchAssessmentsForCompute(companyId);
    const computed = computeTargetEmissions(target, assessments);
    return this.decorateTargetResponse(target, computed);
  }

  async createScopeTarget(
    companyId: number,
    createdById: number,
    data: Extract<CreateTargetData, { type: 'SCOPE' }>,
  ): Promise<TargetResponseDto> {
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
              targetEmission: data.scopes.scope1.targetEmission ?? 0,
              baselineYearEmission:
                data.scopes.scope1.baselineYearEmission ?? 0,
              currentEmission: data.scopes.scope1.currentEmission,
              baselineYear:
                data.scopes.scope1.baselineYear ?? data.baselineYear,
              targetYear: data.scopes.scope1.targetYear ?? data.targetYear,
            },
            {
              scope: 'SCOPE2',
              reductionPercentage: data.scopes.scope2.reductionPercentage,
              targetEmission: data.scopes.scope2.targetEmission ?? 0,
              baselineYearEmission:
                data.scopes.scope2.baselineYearEmission ?? 0,
              currentEmission: data.scopes.scope2.currentEmission,
              baselineYear:
                data.scopes.scope2.baselineYear ?? data.baselineYear,
              targetYear: data.scopes.scope2.targetYear ?? data.targetYear,
            },
            {
              scope: 'SCOPE3',
              reductionPercentage: data.scopes.scope3.reductionPercentage,
              targetEmission: data.scopes.scope3.targetEmission ?? 0,
              baselineYearEmission:
                data.scopes.scope3.baselineYearEmission ?? 0,
              currentEmission: data.scopes.scope3.currentEmission,
              baselineYear:
                data.scopes.scope3.baselineYear ?? data.baselineYear,
              targetYear: data.scopes.scope3.targetYear ?? data.targetYear,
            },
          ],
        },
      },
      include: { generalTarget: true, scopeTargets: true },
    });

    const assessments = await this.fetchAssessmentsForCompute(companyId);
    const computed = computeTargetEmissions(target, assessments);
    return this.decorateTargetResponse(target, computed);
  }

  async updateTarget(
    id: number,
    companyId: number,
    data: UpdateTargetData,
  ): Promise<TargetResponseDto> {
    const existingTarget = await this.prisma.target.findFirst({
      where: { id, companyId },
      include: { generalTarget: true, scopeTargets: true },
    });

    if (!existingTarget) {
      throw new NotFoundException('Target not found');
    }

    if (
      data.targetYear &&
      data.baselineYear &&
      data.targetYear <= data.baselineYear
    ) {
      throw new BadRequestException('Target year must be after baseline year');
    }

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

    if (existingTarget.type === 'GENERAL') {
      return this.updateGeneralTarget(id, companyId, data as UpdateGeneralTargetData);
    }
    return this.updateScopeTarget(id, companyId, data as UpdateScopeTargetData);
  }

  private async updateGeneralTarget(
    id: number,
    companyId: number,
    data: UpdateGeneralTargetData,
  ): Promise<TargetResponseDto> {
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
            },
          },
        }),
      },
      include: { generalTarget: true, scopeTargets: true },
    });

    const assessments = await this.fetchAssessmentsForCompute(companyId);
    const computed = computeTargetEmissions(target, assessments);
    return this.decorateTargetResponse(target, computed);
  }

  private async updateScopeTarget(
    id: number,
    companyId: number,
    data: UpdateScopeTargetData,
  ): Promise<TargetResponseDto> {
    const scopeUpdates: any[] = [];

    if (data.scopes?.scope1) {
      const s1 = data.scopes.scope1;
      scopeUpdates.push(
        this.prisma.scopeTarget.updateMany({
          where: { targetId: id, scope: 'SCOPE1' },
          data: {
            ...(s1.reductionPercentage !== undefined && {
              reductionPercentage: s1.reductionPercentage,
            }),
            ...(s1.baselineYear !== undefined && { baselineYear: s1.baselineYear }),
            ...(s1.targetYear !== undefined && { targetYear: s1.targetYear }),
          },
        }),
      );
    }

    if (data.scopes?.scope2) {
      const s2 = data.scopes.scope2;
      scopeUpdates.push(
        this.prisma.scopeTarget.updateMany({
          where: { targetId: id, scope: 'SCOPE2' },
          data: {
            ...(s2.reductionPercentage !== undefined && {
              reductionPercentage: s2.reductionPercentage,
            }),
            ...(s2.baselineYear !== undefined && { baselineYear: s2.baselineYear }),
            ...(s2.targetYear !== undefined && { targetYear: s2.targetYear }),
          },
        }),
      );
    }

    if (data.scopes?.scope3) {
      const s3 = data.scopes.scope3;
      scopeUpdates.push(
        this.prisma.scopeTarget.updateMany({
          where: { targetId: id, scope: 'SCOPE3' },
          data: {
            ...(s3.reductionPercentage !== undefined && {
              reductionPercentage: s3.reductionPercentage,
            }),
            ...(s3.baselineYear !== undefined && { baselineYear: s3.baselineYear }),
            ...(s3.targetYear !== undefined && { targetYear: s3.targetYear }),
          },
        }),
      );
    }

    if (scopeUpdates.length > 0) {
      await this.prisma.$transaction(scopeUpdates);
    }

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
      include: { generalTarget: true, scopeTargets: true },
    });

    const assessments = await this.fetchAssessmentsForCompute(companyId);
    const computed = computeTargetEmissions(target, assessments);
    return this.decorateTargetResponse(target, computed);
  }

  async deleteTarget(
    id: number,
    companyId: number,
  ): Promise<{ message: string }> {
    const existingTarget = await this.prisma.target.findFirst({
      where: { id, companyId },
    });

    if (!existingTarget) {
      throw new NotFoundException('Target not found');
    }

    await this.prisma.target.delete({ where: { id } });
    return { message: 'Target deleted successfully' };
  }

  // ─────────────────────────── reads (no DB writes) ───────────────────────────

  /**
   * All targets for a company, with emissions computed live from assessments.
   * No DB writes — same query can be hit by multiple pages without the rows
   * mutating between requests.
   */
  async getCompanyTargets(companyId: number): Promise<TargetResponseDto[]> {
    const [targets, assessments] = await Promise.all([
      this.prisma.target.findMany({
        where: { companyId },
        include: { generalTarget: true, scopeTargets: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.fetchAssessmentsForCompute(companyId),
    ]);

    return targets.map((t) =>
      this.decorateTargetResponse(t, computeTargetEmissions(t, assessments)),
    );
  }

  /**
   * Same as `getCompanyTargets` — kept as a separate method to make intent
   * clear for the new `/target/with-progress` consumer. Returns every target
   * in the company so the chart can benchmark them all.
   */
  async getCompanyTargetsWithProgress(
    companyId: number,
  ): Promise<TargetResponseDto[]> {
    return this.getCompanyTargets(companyId);
  }

  /**
   * Latest GENERAL + latest SCOPE target. Read-only — assessments and
   * targets are fetched once, computation is pure.
   */
  async getLatestTargetPair(companyId: number): Promise<{
    general: TargetResponseDto | null;
    scope: TargetResponseDto | null;
  }> {
    const [generalTarget, scopeTarget, assessments] = await Promise.all([
      this.prisma.target.findFirst({
        where: { companyId, type: 'GENERAL' },
        include: { generalTarget: true, scopeTargets: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.target.findFirst({
        where: { companyId, type: 'SCOPE' },
        include: { generalTarget: true, scopeTargets: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.fetchAssessmentsForCompute(companyId),
    ]);

    return {
      general: generalTarget
        ? this.decorateTargetResponse(
            generalTarget,
            computeTargetEmissions(generalTarget, assessments),
          )
        : null,
      scope: scopeTarget
        ? this.decorateTargetResponse(
            scopeTarget,
            computeTargetEmissions(scopeTarget, assessments),
          )
        : null,
    };
  }

  /**
   * Most-recently-created target of any type. Kept for the existing
   * `/target/latest` endpoint contract.
   */
  async getCompanyLatestTarget(companyId: number): Promise<any> {
    const [target, assessments] = await Promise.all([
      this.prisma.target.findFirst({
        where: { companyId },
        include: { generalTarget: true, scopeTargets: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.fetchAssessmentsForCompute(companyId),
    ]);

    if (!target) return null;

    const computed = computeTargetEmissions(target, assessments);
    return this.decorateTargetResponse(target, computed);
  }

  async getSingleTarget(
    id: number,
    companyId: number,
  ): Promise<TargetResponseDto> {
    const target = await this.prisma.target.findFirst({
      where: { id, companyId },
      include: { generalTarget: true, scopeTargets: true },
    });

    if (!target) {
      throw new NotFoundException('Target not found');
    }

    const assessments = await this.fetchAssessmentsForCompute(companyId);
    return this.decorateTargetResponse(
      target,
      computeTargetEmissions(target, assessments),
    );
  }

  // ─────────────────────────── baseline lookups ───────────────────────────

  /**
   * Latest baseline-eligible assessment's totals. Used by older callers that
   * just want "what's the most recent number we have". For target creation,
   * use `resolveBaselineForYear` instead.
   */
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
      orderBy: { createdAt: 'desc' },
    });

    if (!baseline) return null;

    const { startYear, endYear, assessmentData } = baseline as any;
    const totals = assessmentData?.totalEmission ?? null;
    return { startYear, endYear, totals, totalSum: totals };
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
        orderBy: { createdAt: 'desc' },
      });

      if (!baseline) return null;
      assessmentIdToUse = (baseline as any).id;
    }

    const report = await this.prisma.report.findFirst({
      where: { assessmentId: assessmentIdToUse },
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
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        startMonth: true,
        startYear: true,
        endMonth: true,
        endYear: true,
        createdAt: true,
        submittedAt: true,
        approvedAt: true,
        assessmentData: true,
      },
    });

    if (!assessments.length) return [];

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
        submittedAt: a.submittedAt,
        approvedAt: a.approvedAt,
      });
    }

    return options;
  }
}

// Re-exported for ReportService and others that need the same view of an
// approved assessment for emissions math.
export { ASSESSMENT_FOR_COMPUTE_SELECT };
