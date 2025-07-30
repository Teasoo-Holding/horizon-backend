-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_permissionId_fkey";

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "permissionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."permissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
