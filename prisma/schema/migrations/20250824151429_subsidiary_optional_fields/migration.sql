-- AlterTable
ALTER TABLE "public"."Subsidiaries" ALTER COLUMN "registration_number" DROP NOT NULL,
ALTER COLUMN "sicsCode" DROP NOT NULL,
ALTER COLUMN "isoCountryCode" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "contact_email" DROP NOT NULL,
ALTER COLUMN "contact_phone" DROP NOT NULL;
