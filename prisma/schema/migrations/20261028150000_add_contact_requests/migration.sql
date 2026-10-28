-- CreateTable
CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestType" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "orgSize" TEXT,
    "challenge" TEXT,
    "emailStatus" TEXT NOT NULL DEFAULT 'pending',
    "emailError" TEXT,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_requests_createdAt_idx" ON "contact_requests"("createdAt");

-- CreateIndex
CREATE INDEX "contact_requests_emailStatus_idx" ON "contact_requests"("emailStatus");

