/*
  Warnings:

  - You are about to drop the column `description` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `permissions` table. All the data in the column will be lost.
  - Changed the type of `name` on the `roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RoleTypes" AS ENUM ('SUPER_ADMIN', 'RESTRICTED_ADMIN', 'ADMIN_VIEWER', 'ADMIN_EDITOR', 'SUSTAINABILITY_MANAGER', 'C_SUITE_EXEC', 'REGULATOR', 'INVESTOR');

-- DropIndex
DROP INDEX "permissions_name_key";

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "description",
DROP COLUMN "name",
ADD COLUMN     "can_add_department" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_add_user" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_generate_report" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_input_data" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "roles" DROP COLUMN "name",
ADD COLUMN     "name" "RoleTypes" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
