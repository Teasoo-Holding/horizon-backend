/*
  Warnings:

  - Added the required column `createdById` to the `Target` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Target" ADD COLUMN     "createdById" INTEGER NOT NULL;
