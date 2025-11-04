-- CreateEnum
CREATE TYPE "public"."TargetType" AS ENUM ('GENERAL', 'SCOPE');

-- CreateEnum
CREATE TYPE "public"."EmissionScope" AS ENUM ('SCOPE1', 'SCOPE2', 'SCOPE3');

-- CreateTable
CREATE TABLE "public"."Target" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "type" "public"."TargetType" NOT NULL DEFAULT 'GENERAL',
    "description" TEXT NOT NULL,
    "baselineYear" TIMESTAMP(3) NOT NULL,
    "targetYear" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GeneralTarget" (
    "id" SERIAL NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reductionPercentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScopeTarget" (
    "id" SERIAL NOT NULL,
    "targetId" INTEGER NOT NULL,
    "scope" "public"."EmissionScope" NOT NULL,
    "reductionPercentage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScopeTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Target_companyId_idx" ON "public"."Target"("companyId");

-- CreateIndex
CREATE INDEX "Target_type_idx" ON "public"."Target"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Target_companyId_name_key" ON "public"."Target"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralTarget_targetId_key" ON "public"."GeneralTarget"("targetId");

-- CreateIndex
CREATE INDEX "ScopeTarget_targetId_idx" ON "public"."ScopeTarget"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "ScopeTarget_targetId_scope_key" ON "public"."ScopeTarget"("targetId", "scope");

-- AddForeignKey
ALTER TABLE "public"."Target" ADD CONSTRAINT "Target_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GeneralTarget" ADD CONSTRAINT "GeneralTarget_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "public"."Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScopeTarget" ADD CONSTRAINT "ScopeTarget_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "public"."Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;
