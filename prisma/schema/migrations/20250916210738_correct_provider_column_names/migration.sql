/*
  Warnings:

  - You are about to drop the column `providerId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `providerType` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "providerId",
DROP COLUMN "providerType",
ADD COLUMN     "provider_id" VARCHAR(255),
ADD COLUMN     "provider_type" VARCHAR(50);
