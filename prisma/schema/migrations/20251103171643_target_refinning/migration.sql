/*
  Warnings:

  - Changed the type of `baselineYear` on the `Target` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `targetYear` on the `Target` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Target" ALTER COLUMN "description" DROP NOT NULL,
DROP COLUMN "baselineYear",
ADD COLUMN     "baselineYear" INTEGER NOT NULL,
DROP COLUMN "targetYear",
ADD COLUMN     "targetYear" INTEGER NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
