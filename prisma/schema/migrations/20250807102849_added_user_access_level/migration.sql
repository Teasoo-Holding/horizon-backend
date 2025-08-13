/*
  Warnings:

  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_permissions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[companyId,name]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `name` on the `roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `accessLevel` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."AccessLevels" AS ENUM ('SUPER_ADMIN', 'RESTRICTED_ADMIN', 'ADMIN_EDITOR', 'ADMIN_VIEWER', 'ESG_ADMIN', 'ESG_SUB_ADMIN', 'ESG_EDITOR', 'ESG_VIEWER');

-- DropForeignKey
ALTER TABLE "public"."Department" DROP CONSTRAINT "Department_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_permissions" DROP CONSTRAINT "user_permissions_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_permissions" DROP CONSTRAINT "user_permissions_userId_fkey";

-- AlterTable
ALTER TABLE "public"."roles" DROP COLUMN "name",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "accessLevel" "public"."AccessLevels" NOT NULL;

-- DropTable
DROP TABLE "public"."permissions";

-- DropTable
DROP TABLE "public"."user_permissions";

-- DropEnum
DROP TYPE "public"."RoleNames";

-- CreateIndex
CREATE UNIQUE INDEX "Department_companyId_name_key" ON "public"."Department"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name");

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
