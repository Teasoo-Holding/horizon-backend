/*
  Warnings:

  - You are about to drop the `Subsidiaries` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Department" DROP CONSTRAINT "Department_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Invitation" DROP CONSTRAINT "Invitation_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Subsidiaries" DROP CONSTRAINT "Subsidiaries_parentCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Subsidiaries" DROP CONSTRAINT "Subsidiaries_teamLeadId_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_subsidiaryId_fkey";

-- DropTable
DROP TABLE "public"."Subsidiaries";

-- CreateTable
CREATE TABLE "public"."Subsidiary" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "registration_number" TEXT,
    "sicsCode" TEXT,
    "isinCode" TEXT,
    "isoCountryCode" TEXT,
    "sector" TEXT,
    "subSector" TEXT,
    "industry" TEXT,
    "address" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "contact_email" TEXT,
    "website" TEXT,
    "contact_phone" TEXT,
    "company_logo_url" TEXT,
    "status" "public"."CompanyStatus" NOT NULL DEFAULT 'pending',
    "staff" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER NOT NULL,
    "current_subscription_tier" INTEGER,
    "parentCompanyId" INTEGER NOT NULL,
    "teamLeadId" INTEGER NOT NULL,

    CONSTRAINT "Subsidiary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subsidiary_name_key" ON "public"."Subsidiary"("name");

-- CreateIndex
CREATE INDEX "Subsidiary_status_idx" ON "public"."Subsidiary"("status");

-- CreateIndex
CREATE INDEX "Subsidiary_created_at_idx" ON "public"."Subsidiary"("created_at");

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subsidiary" ADD CONSTRAINT "Subsidiary_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subsidiary" ADD CONSTRAINT "Subsidiary_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
