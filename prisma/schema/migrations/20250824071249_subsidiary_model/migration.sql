-- AlterTable
ALTER TABLE "public"."Department" ADD COLUMN     "subsidiaryId" INTEGER;

-- AlterTable
ALTER TABLE "public"."Invitation" ADD COLUMN     "subsidiaryId" INTEGER;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "subsidiaryId" INTEGER;

-- CreateTable
CREATE TABLE "public"."Subsidiaries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "sicsCode" TEXT NOT NULL,
    "isinCode" TEXT,
    "isoCountryCode" TEXT NOT NULL,
    "sector" TEXT,
    "subSector" TEXT,
    "industry" TEXT,
    "address" TEXT NOT NULL,
    "country" TEXT,
    "currency" TEXT,
    "contact_email" TEXT NOT NULL,
    "website" TEXT,
    "contact_phone" TEXT NOT NULL,
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

    CONSTRAINT "Subsidiaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subsidiaries_name_key" ON "public"."Subsidiaries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subsidiaries_teamLeadId_key" ON "public"."Subsidiaries"("teamLeadId");

-- CreateIndex
CREATE INDEX "Subsidiaries_status_idx" ON "public"."Subsidiaries"("status");

-- CreateIndex
CREATE INDEX "Subsidiaries_created_at_idx" ON "public"."Subsidiaries"("created_at");

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subsidiaries" ADD CONSTRAINT "Subsidiaries_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subsidiaries" ADD CONSTRAINT "Subsidiaries_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
