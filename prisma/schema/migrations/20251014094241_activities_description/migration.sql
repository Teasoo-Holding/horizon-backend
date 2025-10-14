-- CreateTable
CREATE TABLE "public"."report" (
    "id" SERIAL NOT NULL,
    "assessmentId" INTEGER NOT NULL,
    "ghg_total_emissions" DOUBLE PRECISION NOT NULL,
    "ghg_scope_one" DOUBLE PRECISION NOT NULL,
    "ghg_scope_two" DOUBLE PRECISION NOT NULL,
    "ghg_scope_three" DOUBLE PRECISION NOT NULL,
    "ghg_datacount_scope_one" DOUBLE PRECISION NOT NULL,
    "ghg_datacount_scope_two" DOUBLE PRECISION NOT NULL,
    "ghg_datacount_scope_three" DOUBLE PRECISION NOT NULL,
    "environmental_total_emissions" DOUBLE PRECISION NOT NULL,
    "environmental_scope_one" DOUBLE PRECISION NOT NULL,
    "environmental_scope_two" DOUBLE PRECISION NOT NULL,
    "environmental_scope_three" DOUBLE PRECISION NOT NULL,
    "environmental_datacount_scope_one" DOUBLE PRECISION NOT NULL,
    "environmental_datacount_scope_two" DOUBLE PRECISION NOT NULL,
    "environmental_datacount_scope_three" DOUBLE PRECISION NOT NULL,
    "social_total_emissions" DOUBLE PRECISION NOT NULL,
    "social_scope_one" DOUBLE PRECISION NOT NULL,
    "social_scope_two" DOUBLE PRECISION NOT NULL,
    "social_scope_three" DOUBLE PRECISION NOT NULL,
    "social_datacount_scope_one" DOUBLE PRECISION NOT NULL,
    "social_datacount_scope_two" DOUBLE PRECISION NOT NULL,
    "social_datacount_scope_three" DOUBLE PRECISION NOT NULL,
    "governance_total_emissions" DOUBLE PRECISION NOT NULL,
    "governance_scope_one" DOUBLE PRECISION NOT NULL,
    "governance_scope_two" DOUBLE PRECISION NOT NULL,
    "governance_scope_three" DOUBLE PRECISION NOT NULL,
    "governance_datacount_scope_one" DOUBLE PRECISION NOT NULL,
    "governance_datacount_scope_two" DOUBLE PRECISION NOT NULL,
    "governance_datacount_scope_three" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_assessmentId_key" ON "public"."report"("assessmentId");

-- AddForeignKey
ALTER TABLE "public"."report" ADD CONSTRAINT "report_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
