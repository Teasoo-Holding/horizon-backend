-- CreateEnum
CREATE TYPE "public"."AssessmentStatus" AS ENUM ('draft', 'submitted');

-- CreateEnum
CREATE TYPE "public"."CompanyStatus" AS ENUM ('pending', 'active', 'suspended', 'disabled');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL');

-- CreateEnum
CREATE TYPE "public"."DisclosureCategory" AS ENUM ('industry_specific', 'supplementary');

-- CreateEnum
CREATE TYPE "public"."FuelType" AS ENUM ('diesel', 'gasoline', 'natural_gas', 'other');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."RoleName" AS ENUM ('super_admin', 'platform_subadmin', 'platform_data_officer', 'platform_viewer', 'company_esg_admin', 'company_esg_subadmin', 'company_esg_data_officer', 'company_esg_viewer');

-- CreateEnum
CREATE TYPE "public"."ReportingPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('pending', 'active', 'approved', 'suspended', 'disabled');

-- CreateTable
CREATE TABLE "public"."assessments" (
    "id" SERIAL NOT NULL,
    "subsidiary" TEXT NOT NULL,
    "reportingPeriod" TEXT NOT NULL,
    "status" "public"."AssessmentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "industryId" INTEGER,
    "isinCode" TEXT,
    "isoCountryCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "country" TEXT,
    "currency" TEXT,
    "contact_email" TEXT NOT NULL,
    "website" TEXT,
    "contact_phone" TEXT NOT NULL,
    "company_logo_url" TEXT,
    "status" "public"."CompanyStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER NOT NULL,
    "current_subscription_tier" INTEGER,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."company_subscriptions" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "subscription_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leadId" INTEGER NOT NULL,
    "contact_email" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "subsidiaryId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."disclosure_topics" (
    "id" SERIAL NOT NULL,
    "assessmentId" INTEGER NOT NULL,
    "category" "public"."DisclosureCategory" NOT NULL,
    "topic" TEXT NOT NULL,
    "subtopic" TEXT NOT NULL,

    CONSTRAINT "disclosure_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ghg_data" (
    "id" SERIAL NOT NULL,
    "disclosureTopicId" INTEGER NOT NULL,

    CONSTRAINT "ghg_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scope1_data" (
    "id" SERIAL NOT NULL,
    "ghgDataId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "scope1_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stationary_sources" (
    "id" SERIAL NOT NULL,
    "scope1DataId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "stationary_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."electricity_heat" (
    "id" SERIAL NOT NULL,
    "stationarySourcesId" INTEGER NOT NULL,
    "dieselFuelType" "public"."FuelType",
    "dieselVolume" DOUBLE PRECISION,
    "gasFuelType" "public"."FuelType",
    "gasVolume" DOUBLE PRECISION,
    "files" JSONB,

    CONSTRAINT "electricity_heat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."industrial_processes" (
    "id" SERIAL NOT NULL,
    "stationarySourcesId" INTEGER NOT NULL,
    "selectedFuelType" "public"."FuelType" NOT NULL,
    "otherFuelType" TEXT,
    "fuelVolume" DOUBLE PRECISION NOT NULL,
    "files" JSONB,

    CONSTRAINT "industrial_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oil_gas_operations" (
    "id" SERIAL NOT NULL,
    "stationarySourcesId" INTEGER NOT NULL,
    "selectedFuelType" "public"."FuelType" NOT NULL,
    "fuelVolume" DOUBLE PRECISION NOT NULL,
    "files" JSONB,

    CONSTRAINT "oil_gas_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mobile_sources" (
    "id" SERIAL NOT NULL,
    "scope1DataId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mobile_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."road_transport" (
    "id" SERIAL NOT NULL,
    "mobileSourcesId" INTEGER NOT NULL,
    "dieselTruckFuelType" "public"."FuelType",
    "dieselTruckVolume" DOUBLE PRECISION,
    "carPetrolVolume" DOUBLE PRECISION,
    "carDieselVolume" DOUBLE PRECISION,
    "files" JSONB,

    CONSTRAINT "road_transport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicle_equipment" (
    "id" SERIAL NOT NULL,
    "mobileSourcesId" INTEGER NOT NULL,
    "forkliftFuelType" "public"."FuelType" NOT NULL,
    "forkliftVolume" DOUBLE PRECISION NOT NULL,
    "heavyDutyFuelType" "public"."FuelType" NOT NULL,
    "heavyDutyVolume" DOUBLE PRECISION NOT NULL,
    "tractorFuelType" "public"."FuelType" NOT NULL,
    "tractorVolume" DOUBLE PRECISION NOT NULL,
    "files" JSONB,

    CONSTRAINT "vehicle_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marine_aviation" (
    "id" SERIAL NOT NULL,
    "mobileSourcesId" INTEGER NOT NULL,
    "helicopterFuelType" "public"."FuelType" NOT NULL,
    "helicopterVolume" DOUBLE PRECISION NOT NULL,
    "vesselFuelType" "public"."FuelType" NOT NULL,
    "vesselVolume" DOUBLE PRECISION NOT NULL,
    "otherFuelType" "public"."FuelType",
    "files" JSONB,

    CONSTRAINT "marine_aviation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."process_emissions" (
    "id" SERIAL NOT NULL,
    "scope1DataId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "process_emissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."co2_release" (
    "id" SERIAL NOT NULL,
    "processEmissionsId" INTEGER NOT NULL,
    "clinkerQuantity" DOUBLE PRECISION NOT NULL,
    "calciumOxide" DOUBLE PRECISION NOT NULL,
    "magnesiumOxide" DOUBLE PRECISION NOT NULL,
    "files" JSONB,

    CONSTRAINT "co2_release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fertilizer_emissions" (
    "id" SERIAL NOT NULL,
    "processEmissionsId" INTEGER NOT NULL,
    "products" JSONB NOT NULL,
    "feedstock" DOUBLE PRECISION NOT NULL,
    "files" JSONB,

    CONSTRAINT "fertilizer_emissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gas_flaring" (
    "id" SERIAL NOT NULL,
    "processEmissionsId" INTEGER NOT NULL,
    "gasVolume" DOUBLE PRECISION NOT NULL,
    "carbonContent" DOUBLE PRECISION NOT NULL,
    "files" JSONB,

    CONSTRAINT "gas_flaring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enteric_fermentation" (
    "id" SERIAL NOT NULL,
    "processEmissionsId" INTEGER NOT NULL,
    "animals" JSONB NOT NULL,
    "files" JSONB,

    CONSTRAINT "enteric_fermentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."methane_nitrous_oxide" (
    "id" SERIAL NOT NULL,
    "processEmissionsId" INTEGER NOT NULL,
    "animals" JSONB NOT NULL,
    "manureSystem" TEXT NOT NULL,
    "otherManureSystem" TEXT,
    "files" JSONB,

    CONSTRAINT "methane_nitrous_oxide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fugitive_emissions" (
    "id" SERIAL NOT NULL,
    "scope1DataId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fugitive_emissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."methane_leaks" (
    "id" SERIAL NOT NULL,
    "fugitiveEmissionsId" INTEGER NOT NULL,
    "compressors" DOUBLE PRECISION NOT NULL,
    "pumps" DOUBLE PRECISION NOT NULL,
    "prds" DOUBLE PRECISION NOT NULL,
    "openEnded" DOUBLE PRECISION NOT NULL,
    "seals" DOUBLE PRECISION NOT NULL,
    "wellheads" DOUBLE PRECISION NOT NULL,
    "manifolds" DOUBLE PRECISION NOT NULL,
    "hoses" DOUBLE PRECISION NOT NULL,
    "drains" DOUBLE PRECISION NOT NULL,
    "sampling" DOUBLE PRECISION NOT NULL,
    "others" DOUBLE PRECISION NOT NULL,
    "methanePercent" DOUBLE PRECISION NOT NULL,
    "files" JSONB,

    CONSTRAINT "methane_leaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."venting_natural_gas" (
    "id" SERIAL NOT NULL,
    "fugitiveEmissionsId" INTEGER NOT NULL,
    "volumeOfGasVented" DOUBLE PRECISION NOT NULL,
    "methane" DOUBLE PRECISION NOT NULL,
    "carbonDioxide" DOUBLE PRECISION NOT NULL,
    "ethane" DOUBLE PRECISION NOT NULL,
    "propane" DOUBLE PRECISION NOT NULL,
    "butanes" DOUBLE PRECISION NOT NULL,
    "wellheads" DOUBLE PRECISION NOT NULL,
    "nitrogen" DOUBLE PRECISION NOT NULL,
    "hydrogenSulfide" DOUBLE PRECISION NOT NULL,
    "others" DOUBLE PRECISION NOT NULL,
    "files" JSONB,

    CONSTRAINT "venting_natural_gas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."incomplete_combustion" (
    "id" SERIAL NOT NULL,
    "fugitiveEmissionsId" INTEGER NOT NULL,
    "volumeToFlare" DOUBLE PRECISION NOT NULL,
    "flareEfficiency" DOUBLE PRECISION NOT NULL,
    "gasComposition" DOUBLE PRECISION NOT NULL,
    "files" JSONB,

    CONSTRAINT "incomplete_combustion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hfc_leaks" (
    "id" SERIAL NOT NULL,
    "fugitiveEmissionsId" INTEGER NOT NULL,
    "R134a" BOOLEAN NOT NULL,
    "R410A" BOOLEAN NOT NULL,
    "R404A" BOOLEAN NOT NULL,
    "R407C" BOOLEAN NOT NULL,
    "R507A" BOOLEAN NOT NULL,
    "others" DOUBLE PRECISION NOT NULL,
    "refrigerantSystem" TEXT,
    "refrigerantAdded" DOUBLE PRECISION NOT NULL,
    "files" JSONB,

    CONSTRAINT "hfc_leaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."industries" (
    "id" SERIAL NOT NULL,
    "sector" TEXT NOT NULL,
    "industry" TEXT NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invitation" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" INTEGER NOT NULL,
    "departmentId" INTEGER,
    "roleId" INTEGER NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "subsidiaryId" INTEGER,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rate_limit" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LocationBasedS2" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subsidiaryId" INTEGER NOT NULL,
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
    "subsidiaryId" INTEGER NOT NULL,
    "creator_id" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "public"."subscription" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_monthly" DOUBLE PRECISION NOT NULL,
    "price_annual" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION,
    "max_team_members" INTEGER,
    "features" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subsidiary" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "registration_number" TEXT,
    "sicsCode" TEXT,
    "isinCode" TEXT,
    "isoCountryCode" TEXT,
    "sector" TEXT,
    "subSector" TEXT,
    "industry" TEXT,
    "address" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "contact_email" TEXT,
    "website" TEXT,
    "contact_phone" TEXT,
    "company_logo_url" TEXT,
    "status" "public"."CompanyStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" INTEGER NOT NULL,
    "current_subscription_tier" INTEGER,
    "parentCompanyId" INTEGER NOT NULL,
    "teamLeadId" INTEGER NOT NULL,

    CONSTRAINT "Subsidiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "phone_number" VARCHAR(20),
    "roleId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "departmentId" INTEGER,
    "subsidiaryId" INTEGER,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'pending',
    "profile_photo_url" VARCHAR(255),
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "otpHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessments_createdById_idx" ON "public"."assessments"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "public"."companies"("name");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "public"."companies"("status");

-- CreateIndex
CREATE INDEX "companies_created_at_idx" ON "public"."companies"("created_at");

-- CreateIndex
CREATE INDEX "company_subscriptions_company_id_idx" ON "public"."company_subscriptions"("company_id");

-- CreateIndex
CREATE INDEX "company_subscriptions_subscription_id_idx" ON "public"."company_subscriptions"("subscription_id");

-- CreateIndex
CREATE INDEX "company_subscriptions_status_idx" ON "public"."company_subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Department_companyId_name_key" ON "public"."Department"("companyId", "name");

-- CreateIndex
CREATE INDEX "disclosure_topics_assessmentId_idx" ON "public"."disclosure_topics"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "disclosure_topics_assessmentId_category_topic_subtopic_key" ON "public"."disclosure_topics"("assessmentId", "category", "topic", "subtopic");

-- CreateIndex
CREATE UNIQUE INDEX "ghg_data_disclosureTopicId_key" ON "public"."ghg_data"("disclosureTopicId");

-- CreateIndex
CREATE INDEX "ghg_data_disclosureTopicId_idx" ON "public"."ghg_data"("disclosureTopicId");

-- CreateIndex
CREATE UNIQUE INDEX "scope1_data_ghgDataId_key" ON "public"."scope1_data"("ghgDataId");

-- CreateIndex
CREATE INDEX "scope1_data_ghgDataId_idx" ON "public"."scope1_data"("ghgDataId");

-- CreateIndex
CREATE UNIQUE INDEX "stationary_sources_scope1DataId_key" ON "public"."stationary_sources"("scope1DataId");

-- CreateIndex
CREATE INDEX "stationary_sources_scope1DataId_idx" ON "public"."stationary_sources"("scope1DataId");

-- CreateIndex
CREATE UNIQUE INDEX "electricity_heat_stationarySourcesId_key" ON "public"."electricity_heat"("stationarySourcesId");

-- CreateIndex
CREATE UNIQUE INDEX "industrial_processes_stationarySourcesId_key" ON "public"."industrial_processes"("stationarySourcesId");

-- CreateIndex
CREATE UNIQUE INDEX "oil_gas_operations_stationarySourcesId_key" ON "public"."oil_gas_operations"("stationarySourcesId");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_sources_scope1DataId_key" ON "public"."mobile_sources"("scope1DataId");

-- CreateIndex
CREATE INDEX "mobile_sources_scope1DataId_idx" ON "public"."mobile_sources"("scope1DataId");

-- CreateIndex
CREATE UNIQUE INDEX "road_transport_mobileSourcesId_key" ON "public"."road_transport"("mobileSourcesId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_equipment_mobileSourcesId_key" ON "public"."vehicle_equipment"("mobileSourcesId");

-- CreateIndex
CREATE UNIQUE INDEX "marine_aviation_mobileSourcesId_key" ON "public"."marine_aviation"("mobileSourcesId");

-- CreateIndex
CREATE UNIQUE INDEX "process_emissions_scope1DataId_key" ON "public"."process_emissions"("scope1DataId");

-- CreateIndex
CREATE INDEX "process_emissions_scope1DataId_idx" ON "public"."process_emissions"("scope1DataId");

-- CreateIndex
CREATE UNIQUE INDEX "co2_release_processEmissionsId_key" ON "public"."co2_release"("processEmissionsId");

-- CreateIndex
CREATE UNIQUE INDEX "fertilizer_emissions_processEmissionsId_key" ON "public"."fertilizer_emissions"("processEmissionsId");

-- CreateIndex
CREATE UNIQUE INDEX "gas_flaring_processEmissionsId_key" ON "public"."gas_flaring"("processEmissionsId");

-- CreateIndex
CREATE UNIQUE INDEX "enteric_fermentation_processEmissionsId_key" ON "public"."enteric_fermentation"("processEmissionsId");

-- CreateIndex
CREATE UNIQUE INDEX "methane_nitrous_oxide_processEmissionsId_key" ON "public"."methane_nitrous_oxide"("processEmissionsId");

-- CreateIndex
CREATE UNIQUE INDEX "fugitive_emissions_scope1DataId_key" ON "public"."fugitive_emissions"("scope1DataId");

-- CreateIndex
CREATE INDEX "fugitive_emissions_scope1DataId_idx" ON "public"."fugitive_emissions"("scope1DataId");

-- CreateIndex
CREATE UNIQUE INDEX "methane_leaks_fugitiveEmissionsId_key" ON "public"."methane_leaks"("fugitiveEmissionsId");

-- CreateIndex
CREATE UNIQUE INDEX "venting_natural_gas_fugitiveEmissionsId_key" ON "public"."venting_natural_gas"("fugitiveEmissionsId");

-- CreateIndex
CREATE UNIQUE INDEX "incomplete_combustion_fugitiveEmissionsId_key" ON "public"."incomplete_combustion"("fugitiveEmissionsId");

-- CreateIndex
CREATE UNIQUE INDEX "hfc_leaks_fugitiveEmissionsId_key" ON "public"."hfc_leaks"("fugitiveEmissionsId");

-- CreateIndex
CREATE UNIQUE INDEX "industries_sector_industry_key" ON "public"."industries"("sector", "industry");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "public"."Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_refresh_token_key" ON "public"."refresh_tokens"("refresh_token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "public"."refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_refresh_token_idx" ON "public"."refresh_tokens"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_name_key" ON "public"."subscription"("name");

-- CreateIndex
CREATE INDEX "Subsidiary_status_idx" ON "public"."Subsidiary"("status");

-- CreateIndex
CREATE INDEX "Subsidiary_created_at_idx" ON "public"."Subsidiary"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Subsidiary_name_parentCompanyId_key" ON "public"."Subsidiary"("name", "parentCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "public"."users"("status");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "public"."users"("companyId");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "public"."users"("created_at");

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "public"."industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_current_subscription_tier_fkey" FOREIGN KEY ("current_subscription_tier") REFERENCES "public"."subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company_subscriptions" ADD CONSTRAINT "company_subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company_subscriptions" ADD CONSTRAINT "company_subscriptions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."disclosure_topics" ADD CONSTRAINT "disclosure_topics_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "public"."assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ghg_data" ADD CONSTRAINT "ghg_data_disclosureTopicId_fkey" FOREIGN KEY ("disclosureTopicId") REFERENCES "public"."disclosure_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scope1_data" ADD CONSTRAINT "scope1_data_ghgDataId_fkey" FOREIGN KEY ("ghgDataId") REFERENCES "public"."ghg_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."stationary_sources" ADD CONSTRAINT "stationary_sources_scope1DataId_fkey" FOREIGN KEY ("scope1DataId") REFERENCES "public"."scope1_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."electricity_heat" ADD CONSTRAINT "electricity_heat_stationarySourcesId_fkey" FOREIGN KEY ("stationarySourcesId") REFERENCES "public"."stationary_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."industrial_processes" ADD CONSTRAINT "industrial_processes_stationarySourcesId_fkey" FOREIGN KEY ("stationarySourcesId") REFERENCES "public"."stationary_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."oil_gas_operations" ADD CONSTRAINT "oil_gas_operations_stationarySourcesId_fkey" FOREIGN KEY ("stationarySourcesId") REFERENCES "public"."stationary_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mobile_sources" ADD CONSTRAINT "mobile_sources_scope1DataId_fkey" FOREIGN KEY ("scope1DataId") REFERENCES "public"."scope1_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."road_transport" ADD CONSTRAINT "road_transport_mobileSourcesId_fkey" FOREIGN KEY ("mobileSourcesId") REFERENCES "public"."mobile_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_equipment" ADD CONSTRAINT "vehicle_equipment_mobileSourcesId_fkey" FOREIGN KEY ("mobileSourcesId") REFERENCES "public"."mobile_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marine_aviation" ADD CONSTRAINT "marine_aviation_mobileSourcesId_fkey" FOREIGN KEY ("mobileSourcesId") REFERENCES "public"."mobile_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."process_emissions" ADD CONSTRAINT "process_emissions_scope1DataId_fkey" FOREIGN KEY ("scope1DataId") REFERENCES "public"."scope1_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."co2_release" ADD CONSTRAINT "co2_release_processEmissionsId_fkey" FOREIGN KEY ("processEmissionsId") REFERENCES "public"."process_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fertilizer_emissions" ADD CONSTRAINT "fertilizer_emissions_processEmissionsId_fkey" FOREIGN KEY ("processEmissionsId") REFERENCES "public"."process_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gas_flaring" ADD CONSTRAINT "gas_flaring_processEmissionsId_fkey" FOREIGN KEY ("processEmissionsId") REFERENCES "public"."process_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enteric_fermentation" ADD CONSTRAINT "enteric_fermentation_processEmissionsId_fkey" FOREIGN KEY ("processEmissionsId") REFERENCES "public"."process_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."methane_nitrous_oxide" ADD CONSTRAINT "methane_nitrous_oxide_processEmissionsId_fkey" FOREIGN KEY ("processEmissionsId") REFERENCES "public"."process_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fugitive_emissions" ADD CONSTRAINT "fugitive_emissions_scope1DataId_fkey" FOREIGN KEY ("scope1DataId") REFERENCES "public"."scope1_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."methane_leaks" ADD CONSTRAINT "methane_leaks_fugitiveEmissionsId_fkey" FOREIGN KEY ("fugitiveEmissionsId") REFERENCES "public"."fugitive_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."venting_natural_gas" ADD CONSTRAINT "venting_natural_gas_fugitiveEmissionsId_fkey" FOREIGN KEY ("fugitiveEmissionsId") REFERENCES "public"."fugitive_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."incomplete_combustion" ADD CONSTRAINT "incomplete_combustion_fugitiveEmissionsId_fkey" FOREIGN KEY ("fugitiveEmissionsId") REFERENCES "public"."fugitive_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hfc_leaks" ADD CONSTRAINT "hfc_leaks_fugitiveEmissionsId_fkey" FOREIGN KEY ("fugitiveEmissionsId") REFERENCES "public"."fugitive_emissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocationBasedS2" ADD CONSTRAINT "LocationBasedS2_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketBasedS2" ADD CONSTRAINT "MarketBasedS2_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subsidiary" ADD CONSTRAINT "Subsidiary_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "public"."companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subsidiary" ADD CONSTRAINT "Subsidiary_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "public"."Subsidiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
