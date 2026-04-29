-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "notify_new_company_reg" BOOLEAN NOT NULL DEFAULT true,
    "notify_payment_failures" BOOLEAN NOT NULL DEFAULT true,
    "notify_report_submissions" BOOLEAN NOT NULL DEFAULT true,
    "notify_algorithm_draft_saved" BOOLEAN NOT NULL DEFAULT false,
    "notify_weekly_summary" BOOLEAN NOT NULL DEFAULT true,
    "two_factor_enforced" BOOLEAN NOT NULL DEFAULT false,
    "login_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "auto_backup_enabled" BOOLEAN NOT NULL DEFAULT true,
    "data_retention_period" TEXT NOT NULL DEFAULT 'Indefinite',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
