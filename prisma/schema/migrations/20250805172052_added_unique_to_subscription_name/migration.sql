/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "subscription_name_key" ON "public"."subscription"("name");
