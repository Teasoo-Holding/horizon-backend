/*
  Warnings:

  - A unique constraint covering the columns `[providerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "providerId" VARCHAR(255),
ADD COLUMN     "providerType" VARCHAR(50),
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_providerId_key" ON "public"."users"("providerId");
