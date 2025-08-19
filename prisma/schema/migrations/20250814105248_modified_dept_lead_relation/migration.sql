/*
  Warnings:

  - You are about to drop the column `lead` on the `Department` table. All the data in the column will be lost.
  - Added the required column `leadId` to the `Department` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Department" DROP COLUMN "lead",
ADD COLUMN     "leadId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
