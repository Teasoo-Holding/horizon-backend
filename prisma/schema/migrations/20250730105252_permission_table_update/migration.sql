/*
  Warnings:

  - You are about to drop the column `description` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `permissions` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."permissions_name_key";

-- AlterTable
ALTER TABLE "public"."permissions" DROP COLUMN "description",
DROP COLUMN "name",
ADD COLUMN     "can_add_department" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_add_user" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_generate_report" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_input_data" BOOLEAN NOT NULL DEFAULT false;
