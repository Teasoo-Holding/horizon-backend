/**
 * Wipe ESG core data from the local dev DB so we can re-test the target /
 * assessment flow against fresh data. Deletes in FK-safe order:
 *
 *   Reports              (FK → Assessment, no cascade)
 *   Tasks (with asmtId)  (FK → Assessment, no cascade)
 *   Targets              (cascades GeneralTarget / ScopeTarget)
 *   Assessments          (cascades DisclosureTopic / GhgData)
 *
 * Companies, users, roles, departments, subsidiaries, industries, etc. are
 * left intact so logging in still works.
 *
 * Run with:   yarn ts-node scripts/wipe-esg-data.ts
 *      or:   npx ts-node scripts/wipe-esg-data.ts
 *
 * Refuses to run unless DATABASE_URL points at localhost.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes('localhost')) {
    console.error(
      `Refusing to run: DATABASE_URL does not point at localhost.\n  ${url}`,
    );
    process.exit(1);
  }

  console.log('--- BEFORE ---');
  const before = await counts();
  printCounts(before);

  console.log('\n--- DELETING ---');
  // Order matters: FKs without cascade must go first.
  const reports = await prisma.report.deleteMany({});
  console.log(`reports:        ${reports.count}`);

  const taskAssignments = await prisma.taskAssignment.deleteMany({
    where: { assessmentId: { not: null } },
  });
  console.log(`taskAssignments: ${taskAssignments.count}`);

  const targets = await prisma.target.deleteMany({});
  console.log(`targets:        ${targets.count}`);

  const assessments = await prisma.assessment.deleteMany({});
  console.log(`assessments:    ${assessments.count}`);

  console.log('\n--- AFTER ---');
  const after = await counts();
  printCounts(after);

  if (
    after.reports === 0 &&
    after.targets === 0 &&
    after.assessments === 0 &&
    after.generalTargets === 0 &&
    after.scopeTargets === 0
  ) {
    console.log('\n✓ Clean slate. Submit a fresh assessment and recreate targets.');
  }
}

async function counts() {
  const [
    assessments,
    reports,
    targets,
    generalTargets,
    scopeTargets,
    taskAssignmentsLinked,
  ] = await Promise.all([
    prisma.assessment.count(),
    prisma.report.count(),
    prisma.target.count(),
    prisma.generalTarget.count(),
    prisma.scopeTarget.count(),
    prisma.taskAssignment.count({ where: { assessmentId: { not: null } } }),
  ]);
  return {
    assessments,
    reports,
    targets,
    generalTargets,
    scopeTargets,
    taskAssignmentsLinked,
  };
}

function printCounts(c: Awaited<ReturnType<typeof counts>>) {
  console.log(`assessments:           ${c.assessments}`);
  console.log(`reports:               ${c.reports}`);
  console.log(`targets:               ${c.targets}`);
  console.log(`  generalTargets:      ${c.generalTargets}`);
  console.log(`  scopeTargets:        ${c.scopeTargets}`);
  console.log(`taskAssignments (asmt):${c.taskAssignmentsLinked}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
