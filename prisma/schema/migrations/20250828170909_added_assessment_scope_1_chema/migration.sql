/*
  Warnings:

  - You are about to drop the column `staff` on the `Subsidiary` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AssessmentStatus" AS ENUM ('draft', 'submitted');

-- CreateEnum
CREATE TYPE "public"."DisclosureCategory" AS ENUM ('industry_specific', 'supplementary');

-- CreateEnum
CREATE TYPE "public"."FuelType" AS ENUM ('diesel', 'gasoline', 'natural_gas', 'other');

-- AlterTable
ALTER TABLE "public"."Subsidiary" DROP COLUMN "staff",
ALTER COLUMN "status" SET DEFAULT 'active';

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

-- CreateIndex
CREATE INDEX "assessments_createdById_idx" ON "public"."assessments"("createdById");

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

-- AddForeignKey
ALTER TABLE "public"."assessments" ADD CONSTRAINT "assessments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
