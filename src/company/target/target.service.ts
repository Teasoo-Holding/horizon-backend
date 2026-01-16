import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTargetData } from './dto/create-target.dto';
import {
  UpdateGeneralTargetData,
  UpdateScopeTargetData,
  UpdateTargetData,
} from './dto/update-target.dto';
import { TargetResponseDto } from './dto/target-response.dto';
import { EmissionScope } from '@prisma/client';

interface ComputedTotals {
  totals: any; // replace 'any' with more specific type if you want
}

interface AssessmentData {
  _computed?: ComputedTotals;
  [key: string]: any; // other dynamic fields
}
@Injectable()
export class TargetService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new target for a company
   */
  async createTarget(
    companyId: number,
    createdById: number,
    data: CreateTargetData,
  ): Promise<TargetResponseDto> {
    const baselineData = await this.getBaselineValue(companyId);

    if (!baselineData) {
      throw new BadRequestException(
        'You must complete at least one assessment before setting a target',
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
    if (data.type === 'GENERAL') {
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

    console.log('Fetched targets:', targets);
    return targets.map((target) => this.formatTargetResponse(target));
  }

 async getCompanyLatestTarget(companyId: number): Promise<any> {
  /**
   * 1. Fetch latest valid assessment
   */
  const latestAssessment = await this.prisma.assessment.findFirst({
    where: {
      companyId,
      startYear: { not: '' },
      endYear: { not: '' },
      startMonth: { not: '' },
      endMonth: { not: '' },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestAssessment) {
    throw new Error(`No assessment found for company ID: ${companyId}`);
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
    throw new Error(`No target found for company ID: ${companyId}`);
  }

  const baselineAssessment = await this.prisma.assessment.findFirst({
  where: {
    companyId,
    // startYear: String(target.baselineYear),
  },
  orderBy: { createdAt: 'asc' }, // FIRST assessment of baseline year
});

const baselineScopeTotals =
  (baselineAssessment?.assessmentData as AssessmentData)
    ?.environment?.ghg;

  /**
   * 3. Extract assessment data safely
   */
  const assessmentData = latestAssessment.assessmentData as AssessmentData;

  /**
   * 4. Update General Target (if present)
   */
  if (target.generalTarget) {
    await this.prisma.generalTarget.update({
      where: { targetId: target.id },
      data: {
        currentEmission: assessmentData?.totalEmission ?? 0,
      },
    });
  }

  /**
   * 5. Prepare scope emissions from assessment
   */
  const scopeTotals = assessmentData?.environment?.ghg;

  const scopeEmissions = [
  {
    scope: EmissionScope.SCOPE1,
    currentEmission: scopeTotals?.scope1?.totalEmission ?? 0,
    baselineEmission: baselineScopeTotals?.scope1?.totalEmission ?? 0,
  },
  {
    scope: EmissionScope.SCOPE2,
    currentEmission: scopeTotals?.scope2?.totalEmission ?? 0,
    baselineEmission: baselineScopeTotals?.scope2?.totalEmission ?? 0,
  },
  {
    scope: EmissionScope.SCOPE3,
    currentEmission: scopeTotals?.scope3?.totalEmission ?? 0,
    baselineEmission: baselineScopeTotals?.scope3?.totalEmission ?? 0,
  },
];


  // console.log('Scope Emissions to update:', scope1EmissionSum);
  /**
   * 6. Update or create scope targets (safe + atomic)
   */
  if (target.scopeTargets.length > 0) {
    await Promise.all(
  scopeEmissions.map(se =>
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
        reductionPercentage: 0,
        targetEmission: 0,
      },
    })
  )
);

  }

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

  return this.formatTargetResponse(updatedTarget);
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
      // baseline,
    };
  }

  async getBaselineValueByScope(companyId: number) {
    const baseline = await this.prisma.assessment.findFirst({
      where: {
        companyId,
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

    const { id } = baseline as any;
    const report = await this.prisma.report.findFirst({
      where: {
        assessmentId: id,
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
}
