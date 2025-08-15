/*
  Warnings:

  - Added the required column `contact_email` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lead` to the `Department` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Department" ADD COLUMN     "contact_email" TEXT NOT NULL,
ADD COLUMN     "lead" TEXT NOT NULL;
