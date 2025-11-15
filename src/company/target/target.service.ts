import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTargetData } from "./dto/create-target.dto";
import { UpdateGeneralTargetData, UpdateScopeTargetData, UpdateTargetData } from "./dto/update-target.dto";
import { TargetResponseDto } from './dto/target-response.dto';
import { scope1EmissionSum, sumAllValues } from './lib/compute';


interface ComputedTotals {
  totals: any; // replace 'any' with more specific type if you want
}

interface AssessmentData {
  _computed?: ComputedTotals;
  [key: string]: any; // other dynamic fields
}
@Injectable()
export class TargetService {
  constructor(
    private prisma: PrismaService
  ) { }

  /**
   * Create a new target for a company
   */
  async createTarget(companyId: number, createdById: number, data: CreateTargetData): Promise<TargetResponseDto> {


    // Check if assessment exists
    const baselineData = await this.getBaselineValue(companyId);

    // Check if assessment exists
    if (!baselineData) {
      throw new BadRequestException(
        'You must complete at least one assessment before setting a target'
      );
    }

    // Check if assessment has required data
    if (!baselineData.startYear || baselineData.totals?.total === null) {
      throw new BadRequestException(
        'Your assessment must have a valid start year and emissions data before setting a target'
      );
    }
    // Validate timeline
    if (data.targetYear <= data.baselineYear) {
      throw new BadRequestException('Target year must be after baseline year');
    }

    // Create target based on type
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
    data: Extract<CreateTargetData, { type: 'GENERAL' }>
  ): Promise<TargetResponseDto> {  // Changed to TargetResponseDto
    const target = await this.prisma.target.create({
      data: {
        companyId,
        name: data.name,
        type: 'GENERAL',
        createdById,
        description: data.description ?? "",
        baselineYear: data.baselineYear,
        targetYear: data.targetYear,
        generalTarget: {
          create: {
            reductionPercentage: data.reductionPercentage,
            baselineYearEmission: data.baselineYearEmission,
            targetEmission: data.targetEmission,
            currentEmission: data.currentEmission
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
    data: Extract<CreateTargetData, { type: 'SCOPE' }>
  ): Promise<TargetResponseDto> {  // Changed to TargetResponseDto
    const target = await this.prisma.target.create({
      data: {
        companyId,
        name: data.name,
        type: 'SCOPE',
        createdById,
        description: data.description ?? "",
        baselineYear: data.baselineYear,
        targetYear: data.targetYear,
        scopeTargets: {
          create: [
            {
              scope: 'SCOPE1',
              reductionPercentage: data.scopes.scope1.reductionPercentage,
              targetEmission: data.scopes.scope1.targetEmission,
              baselineYearEmission: data.scopes.scope1.baselineYearEmission,
              currentEmission: data.scopes.scope1.currentEmission
            },
            {
              scope: 'SCOPE2',
              reductionPercentage: data.scopes.scope2.reductionPercentage,
              targetEmission: data.scopes.scope2.targetEmission,
              baselineYearEmission: data.scopes.scope2.baselineYearEmission,
              currentEmission: data.scopes.scope2.currentEmission
            },
            {
              scope: 'SCOPE3',
              reductionPercentage: data.scopes.scope3.reductionPercentage,
              targetEmission: data.scopes.scope3.targetEmission,
              baselineYearEmission: data.scopes.scope3.baselineYearEmission,
              currentEmission: data.scopes.scope3.currentEmission
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
    data: UpdateTargetData
  ): Promise<TargetResponseDto> {  // Changed to TargetResponseDto
    // Check if target exists and belongs to company
    const existingTarget = await this.prisma.target.findFirst({
      where: { id, companyId },
      include: { generalTarget: true, scopeTargets: true },
    });

    if (!existingTarget) {
      throw new NotFoundException('Target not found');
    }

    // Validate timeline if years are being updated
    if (data.targetYear && data.baselineYear && data.targetYear <= data.baselineYear) {
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
        throw new BadRequestException(`A target with name "${data.name}" already exists for this company`);
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
    data: UpdateGeneralTargetData
  ): Promise<TargetResponseDto> {  // Changed to TargetResponseDto
    const target = await this.prisma.target.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
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
    data: UpdateScopeTargetData
  ): Promise<TargetResponseDto> {  // Changed to TargetResponseDto
    // Build scope updates
    const scopeUpdates: any[] = [];

    if (data.scopes?.scope1?.reductionPercentage !== undefined) {
      scopeUpdates.push(
        this.prisma.scopeTarget.updateMany({
          where: { targetId: id, scope: 'SCOPE1' },
          data: { reductionPercentage: data.scopes.scope1.reductionPercentage },
        })
      );
    }

    if (data.scopes?.scope2?.reductionPercentage !== undefined) {
      scopeUpdates.push(
        this.prisma.scopeTarget.updateMany({
          where: { targetId: id, scope: 'SCOPE2' },
          data: { reductionPercentage: data.scopes.scope2.reductionPercentage },
        })
      );
    }

    if (data.scopes?.scope3?.reductionPercentage !== undefined) {
      scopeUpdates.push(
        this.prisma.scopeTarget.updateMany({
          where: { targetId: id, scope: 'SCOPE3' },
          data: { reductionPercentage: data.scopes.scope3.reductionPercentage },
        })
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
        ...(data.description !== undefined && { description: data.description }),
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
  async deleteTarget(id: number, companyId: number): Promise<{ message: string }> {
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
  async getCompanyTargets(companyId: number): Promise<TargetResponseDto[]> {  // Changed to TargetResponseDto[]
    const targets = await this.prisma.target.findMany({
      where: { companyId },
      include: {
        generalTarget: true,
        scopeTargets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return targets.map(target => this.formatTargetResponse(target));
  }


  async getCompanyLatestTarget(companyId: number): Promise<any> {

    const latestAssessment = await this.prisma.assessment.findFirst({
      where: {
        companyId,
        startYear: { not: '' },
        endYear: { not: '' },
        startMonth: { not: '' },
        endMonth: { not: '' }
      },
      orderBy: { createdAt: 'desc' }
    });


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

    const assessmentData = latestAssessment?.assessmentData as AssessmentData;
    const assessmentRoute = assessmentData?.__computed?.scopeTotals;
    const scopeRoute = assessmentData?.__computed?.scopeTotals
    if (target.generalTarget) {

      await this.prisma.generalTarget.update({
        where: {
          targetId: target?.id
        },
        data: {
          currentEmission: assessmentRoute?.sum
        }
      })
    }

    const scopeEmissions = [
      {
        scope: 'SCOPE1',
        currentEmission: scopeRoute?.scope1
      },
      {
        scope: 'SCOPE2',
        currentEmission: scopeRoute?.scope2,
      },
      {
        scope: 'SCOPE3',
        currentEmission: scopeRoute?.scope3,
      },
    ];

    const dbScopeTargets = await this.prisma.scopeTarget.findMany({
      where: { targetId: target?.id }
    });

    if (target.scopeTargets) {
      const updatedScopeTargets = await Promise.all(
        scopeEmissions.map(se => {
          const dbScope = dbScopeTargets.find(ds => ds.scope === se.scope);
          if (!dbScope) return null;

          return this.prisma.scopeTarget.update({
            where: { id: dbScope.id },
            data: { currentEmission: se.currentEmission }
          });
        })
      );
    }




    const updatedTarge = await this.prisma.target.findFirst({
      where: { companyId },
      include: {
        generalTarget: true,
        scopeTargets: true,
      },
      orderBy: { createdAt: 'desc' },
    });


    return this.formatTargetResponse(updatedTarge)
    // return scopeRoute

  }
  /**
   * Get a single target
   */
  async getSingleTarget(id: number, companyId: number): Promise<TargetResponseDto> {  // Changed to TargetResponseDto
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
      generalTarget: target.generalTarget ? {
        id: target.generalTarget.id,
        reductionPercentage: target.generalTarget.reductionPercentage,
        targetEmission: target.generalTarget.targetEmission,
        baselineYearEmission: target.baselineYearEmission,
        currentEmission: target.currentEmission
      } : undefined,
      scopeTargets: target.scopeTargets?.map((scope: any) => ({
        id: scope.id,
        scope: scope.scope,
        reductionPercentage: scope.reductionPercentage,
        targetEmission: scope.targetEmission,
        baselineYearEmission: scope.baselineYearEmission,
        currentEmission: scope.currentEmission
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


    const totals = assessmentData?.__computed?.scopeTotals

    return {
      startYear,
      endYear,
      totals,
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
        startYear: true
      }
    })
    return report


  }



}