-- CreateIndex
CREATE INDEX "Activities_companyId_createdAt_idx" ON "Activities"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Activities_createdById_createdAt_idx" ON "Activities"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "assessments_companyId_status_createdAt_idx" ON "assessments"("companyId", "status", "createdAt");
