-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('pending', 'in_progress', 'completed', 'approved', 'rejected', 'on_hold');

-- AlterTable
ALTER TABLE "public"."Task" ADD COLUMN     "status" "public"."TaskStatus" NOT NULL DEFAULT 'pending';
