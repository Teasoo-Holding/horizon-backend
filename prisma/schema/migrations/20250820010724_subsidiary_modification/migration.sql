/*
  Warnings:

  - The values [pending,active,suspended,disabled] on the enum `CompanyStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."CompanyStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED');
ALTER TABLE "public"."companies" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."companies" ALTER COLUMN "status" TYPE "public"."CompanyStatus_new" USING ("status"::text::"public"."CompanyStatus_new");
ALTER TYPE "public"."CompanyStatus" RENAME TO "CompanyStatus_old";
ALTER TYPE "public"."CompanyStatus_new" RENAME TO "CompanyStatus";
DROP TYPE "public"."CompanyStatus_old";
ALTER TABLE "public"."companies" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "public"."companies" ALTER COLUMN "status" SET DEFAULT 'PENDING';
