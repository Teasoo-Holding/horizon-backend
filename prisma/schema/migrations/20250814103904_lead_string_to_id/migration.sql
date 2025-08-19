/*
  Warnings:

  - Changed the type of `lead` on the `Department` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Department" DROP COLUMN "lead",
ADD COLUMN     "lead" INTEGER NOT NULL;
