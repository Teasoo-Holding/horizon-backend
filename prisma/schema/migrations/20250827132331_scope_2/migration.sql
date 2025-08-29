-- CreateEnum
CREATE TYPE "public"."ReportingPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "public"."LocationBasedS2" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "creator_id" INTEGER NOT NULL,
    "total_electricity_consumption" DOUBLE PRECISION NOT NULL,
    "reporting_period_consumption" "public"."ReportingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "electricity_supplier" TEXT NOT NULL,
    "invoice_from_electricity_distribution_companies_url" TEXT NOT NULL,
    "invoice_from_electricity_distribution_companies_url_public_id" TEXT NOT NULL,
    "smart_or_sub_meter_reading_url" TEXT NOT NULL,
    "smart_or_sub_meter_reading_url_public_id" TEXT NOT NULL,
    "utility_contract_or_purchase_agreement_url" TEXT NOT NULL,
    "utility_contract_or_purchase_agreement_url_public_id" TEXT NOT NULL,
    "amount_of_cooling_energy_consumed" DOUBLE PRECISION NOT NULL,
    "purchased_cooling_type_of_cooling_system_used" TEXT NOT NULL,
    "purchased_cooling_reporting_period" "public"."ReportingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "cooling_energy_invoices_from_service_providers_url" TEXT NOT NULL,
    "cooling_energy_invoices_from_service_providers_url_public_id" TEXT NOT NULL,
    "equipment_performance_log_url" TEXT NOT NULL,
    "equipment_performance_log_url_public_id" TEXT NOT NULL,
    "sub_metering_records_url" TEXT NOT NULL,
    "sub_metering_records_url_public_id" TEXT NOT NULL,
    "total_steam_consumed" DOUBLE PRECISION NOT NULL,
    "source_of_steam_consumed" TEXT NOT NULL,
    "purchased_steam_reporting_period" "public"."ReportingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "supplier_invoice_for_steam_purchased_url" TEXT NOT NULL,
    "supplier_invoice_for_steam_purchased_url_public_id" TEXT NOT NULL,
    "metered_record_for_steam_consumed_url" TEXT NOT NULL,
    "metered_record_for_steam_consumed_url_public_id" TEXT NOT NULL,
    "contracts_with_third_party_providers_url" TEXT NOT NULL,
    "contracts_with_third_party_providers_url_public_id" TEXT NOT NULL,
    "was_heating_energy_purchased" BOOLEAN NOT NULL,
    "total_energyGJ" DOUBLE PRECISION,
    "supplier" TEXT,
    "invoices_for_heating_services_url" TEXT,
    "invoices_for_heating_services_url_public_id" TEXT,
    "metered_heating_records_url" TEXT,
    "metered_heating_records_url_public_id" TEXT,
    "supplier_contracts_url" TEXT,
    "supplier_contracts_url_public_id" TEXT,
    "certification_of_refigirant_type_url" TEXT,
    "certification_of_refigirant_type_url_public_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationBasedS2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketBasedS2" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "total_electricity_consumed" DOUBLE PRECISION NOT NULL,
    "supplier_specific_emission_factor" DOUBLE PRECISION NOT NULL,
    "companyId" INTEGER NOT NULL,
    "electricity_supplier_contract_with_ipps_url" TEXT NOT NULL,
    "electricity_supplier_contract_with_ipps_url_public_id" TEXT NOT NULL,
    "supplier_issued_emmission_factor_documentation_url" TEXT NOT NULL,
    "supplier_issued_emmission_factor_documentation_url_public_id" TEXT NOT NULL,
    "invoices_and_bills_from_ipp_url" TEXT NOT NULL,
    "invoices_or_bills_from_ipp_url_public_id" TEXT NOT NULL,
    "total_grid_energy_consumed" DOUBLE PRECISION NOT NULL,
    "eac_or_rec_certificate_url" TEXT NOT NULL,
    "eac_or_rec_certificate_url_public_id" TEXT NOT NULL,
    "emission_factor_applied" DOUBLE PRECISION NOT NULL,
    "energy_attribute_certificate_url" TEXT NOT NULL,
    "energy_attribute_certificate_url_public_id" TEXT NOT NULL,
    "grid_consumption_invoices_url" TEXT NOT NULL,
    "grid_consumption_invoices_url_public_id" TEXT NOT NULL,
    "contracts_or_purchased_agreement_url" TEXT NOT NULL,
    "contracts_or_purchased_agreement_url_public_id" TEXT NOT NULL,
    "purchased_electricity_total_electricity_consumed" DOUBLE PRECISION NOT NULL,
    "residual_mix_emission_factor_applied" DOUBLE PRECISION NOT NULL,
    "grid_electricity_invoices_url" TEXT NOT NULL,
    "grid_electricity_invoices_url_public_id" TEXT NOT NULL,
    "nigerian_grid_emission_factor_documentation_url" TEXT NOT NULL,
    "nigerian_grid_emission_factor_documentation_url_public_id" TEXT NOT NULL,
    "supplier_contacts_url" TEXT NOT NULL,
    "supplier_contacts_url_public_id" TEXT NOT NULL,
    "purchased_cooling_quantity_consumed" DOUBLE PRECISION NOT NULL,
    "purchased_cooling_supplier_specific_emission_factor_applied" DOUBLE PRECISION NOT NULL,
    "supplier_invoices_for_cooling_or_steam_purchases_url" TEXT NOT NULL,
    "supplier_invoices_for_cooling_or_steam_purchases_url_public_id" TEXT NOT NULL,
    "supplier_emission_factor_data_sheet_url" TEXT NOT NULL,
    "supplier_emission_factor_data_sheet_url_public_id" TEXT NOT NULL,
    "performance_or_operational_logs_url" TEXT NOT NULL,
    "performance_or_operational_logs_url_public_id" TEXT NOT NULL,

    CONSTRAINT "MarketBasedS2_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."LocationBasedS2" ADD CONSTRAINT "LocationBasedS2_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketBasedS2" ADD CONSTRAINT "MarketBasedS2_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
