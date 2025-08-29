/*
  Warnings:

  - Added the required column `creator_id` to the `MarketBasedS2` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."MarketBasedS2" ADD COLUMN     "creator_id" INTEGER NOT NULL;
