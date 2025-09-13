-- AlterTable
ALTER TABLE "public"."companies" ADD COLUMN     "staff_strength" TEXT,
ALTER COLUMN "registration_number" DROP NOT NULL;
