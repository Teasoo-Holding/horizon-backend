import { Assessment } from '@prisma/client';

export type AssessmentForCompute = Pick<
  Assessment,
  | 'id'
  | 'startYear'
  | 'assessmentData'
  | 'approvedAt'
  | 'submittedAt'
  | 'updatedAt'
  | 'createdAt'
>;

export type TargetForCompute = {
  id: number;
  type: 'GENERAL' | 'SCOPE' | 'BOTH';
  baselineYear: number;
  targetYear: number;
  generalTarget?: {
    reductionPercentage: number;
  } | null;
  scopeTargets?: Array<{
    scope: 'SCOPE1' | 'SCOPE2' | 'SCOPE3';
    reductionPercentage: number;
    baselineYear?: number | null;
    targetYear?: number | null;
  }> | null;
};

export type EmissionFigures = {
  baselineYearEmission: number | null;
  currentEmission: number | null;
  targetEmission: number | null;
};

export type ComputedScopeFigures = {
  scope: 'SCOPE1' | 'SCOPE2' | 'SCOPE3';
  figures: EmissionFigures;
  baselineYear: number;
  targetYear: number;
};

export type ComputedTargetEmissions = {
  general: EmissionFigures | null;
  scopes: ComputedScopeFigures[];
  currentAssessmentYear: number | null;
};

export type ComputeOptions = {
  /**
   * Force the "current" assessment instead of looking up the latest. Used by
   * the report endpoint so a 2024 report always shows 2024 numbers, not
   * whichever assessment happens to be latest when the report is viewed.
   */
  currentAssessmentOverride?: AssessmentForCompute | null;
};

/**
 * Find the FIRST approved assessment for a baseline year (earliest by createdAt).
 * Used to anchor a target's baseline to a real assessment instead of trusting
 * stored values that drift between reads.
 */
export function findBaselineAssessment(
  assessments: AssessmentForCompute[],
  baselineYear: number,
): AssessmentForCompute | null {
  return (
    assessments
      .filter((a) => Number(a.startYear) === baselineYear)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null
  );
}

/**
 * Find the LATEST approved assessment that counts as the "current" measurement
 * for a target — strictly AFTER baseline year (so we never report the baseline
 * itself as current) and on/before target year.
 */
export function findCurrentAssessment(
  assessments: AssessmentForCompute[],
  baselineYear: number,
  targetYear: number,
): AssessmentForCompute | null {
  return (
    assessments
      .filter((a) => {
        const y = Number(a.startYear);
        return y > baselineYear && y <= targetYear;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
  );
}

function getTotalEmission(a: AssessmentForCompute | null): number | null {
  if (!a) return null;
  const data = a.assessmentData as { totalEmission?: number } | null;
  const v = data?.totalEmission;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function getScopeEmission(
  a: AssessmentForCompute | null,
  scope: 'SCOPE1' | 'SCOPE2' | 'SCOPE3',
): number | null {
  if (!a) return null;
  const data = a.assessmentData as
    | { environment?: { ghg?: Record<string, { totalEmission?: number }> } }
    | null;
  const key =
    scope === 'SCOPE1' ? 'scope1' : scope === 'SCOPE2' ? 'scope2' : 'scope3';
  const v = data?.environment?.ghg?.[key]?.totalEmission;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function buildFigures(
  baseline: number | null,
  current: number | null,
  reductionPercentage: number,
): EmissionFigures {
  return {
    baselineYearEmission: baseline,
    currentEmission: current,
    targetEmission:
      baseline != null ? baseline * (1 - reductionPercentage / 100) : null,
  };
}

/**
 * Compute baseline / current / target emissions for a single target row using
 * a pre-fetched list of approved assessments. Pure — no DB writes, no
 * mutation of the input target.
 *
 * Resolution rules:
 *  • Baseline = FIRST approved assessment whose startYear === baselineYear.
 *  • Current  = LATEST approved assessment whose startYear is in
 *               (baselineYear, targetYear]. Strictly *after* baseline so
 *               the baseline assessment itself is never reported as current.
 *  • If no current is available, currentEmission is null — the UI should
 *    surface "awaiting first measurement" rather than render 0%.
 */
export function computeTargetEmissions(
  target: TargetForCompute,
  assessments: AssessmentForCompute[],
  options?: ComputeOptions,
): ComputedTargetEmissions {
  const override = options?.currentAssessmentOverride ?? null;
  const parentBaseline = findBaselineAssessment(assessments, target.baselineYear);
  const parentCurrent =
    override ??
    findCurrentAssessment(assessments, target.baselineYear, target.targetYear);

  let general: EmissionFigures | null = null;
  if (target.generalTarget) {
    const baseline = getTotalEmission(parentBaseline);
    const current = getTotalEmission(parentCurrent);
    general = buildFigures(
      baseline,
      current,
      target.generalTarget.reductionPercentage,
    );
  }

  const scopes: ComputedScopeFigures[] = [];
  if (target.scopeTargets?.length) {
    for (const st of target.scopeTargets) {
      const sBaselineYear = st.baselineYear ?? target.baselineYear;
      const sTargetYear = st.targetYear ?? target.targetYear;
      const sBaselineAsmt = findBaselineAssessment(assessments, sBaselineYear);
      const sCurrentAsmt =
        override ??
        findCurrentAssessment(assessments, sBaselineYear, sTargetYear);
      const baselineEmission = getScopeEmission(sBaselineAsmt, st.scope);
      const currentEmission = getScopeEmission(sCurrentAsmt, st.scope);
      scopes.push({
        scope: st.scope,
        figures: buildFigures(
          baselineEmission,
          currentEmission,
          st.reductionPercentage,
        ),
        baselineYear: sBaselineYear,
        targetYear: sTargetYear,
      });
    }
  }

  return {
    general,
    scopes,
    currentAssessmentYear: parentCurrent?.startYear
      ? Number(parentCurrent.startYear)
      : null,
  };
}
