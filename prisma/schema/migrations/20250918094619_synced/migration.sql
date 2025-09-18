-- AlterTable
ALTER TABLE "public"."companies" ALTER COLUMN "isoCountryCode" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "contact_email" DROP NOT NULL,
ALTER COLUMN "contact_phone" DROP NOT NULL;
