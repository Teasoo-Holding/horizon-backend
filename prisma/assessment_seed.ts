import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Disclosure Hierarchy...');

  // 1. Sector
  const sector = await prisma.sector.upsert({
    where: { name: 'Extractives and Minerals Processing' },
    update: {},
    create: {
      name: 'Extractives and Minerals Processing',
      description: 'Companies involved in extracting raw materials from the earth.',
    },
  });

  // 2. Industry
  const industry = await prisma.industry.upsert({
    where: {
      sectorId_name: {
        sectorId: sector.id,
        name: 'Oil & Gas-Exploration & Production',
      },
    },
    update: {},
    create: {
      name: 'Oil & Gas-Exploration & Production',
      sectorId: sector.id,
    },
  });

  // 3. Pillar
  const environmentalPillar = await prisma.pillar.upsert({
    where: { id: 1 },
    update: {
      name: 'Environmental',
      description: 'Environmental impact and sustainability metrics.',
    },
    create: {
      name: 'Environmental',
      description: 'Environmental impact and sustainability metrics.',
    },
  });

  // Link Pillar to Industry
  await prisma.pillarOnIndustry.upsert({
    where: {
      pillarId_industryId: {
        pillarId: environmentalPillar.id,
        industryId: industry.id,
      },
    },
    update: {},
    create: {
      pillarId: environmentalPillar.id,
      industryId: industry.id,
    },
  });

  // 4. Topic: GHG Emissions
  const ghgTopic = await prisma.disclosureTopic.create({
    data: {
      name: 'Greenhouse Gas Emissions',
      pillarId: environmentalPillar.id,
    },
  });

  // 5. Subtopic: Scope 1
  const scope1Subtopic = await prisma.disclosureSubtopic.create({
    data: {
      name: 'Scope 1',
      topicId: ghgTopic.id,
    },
  });

  // 6. Metric: Stationary Sources
  const stationaryMetric = await prisma.disclosureMetric.create({
    data: {
      name: 'Stationary Sources',
      subtopicId: scope1Subtopic.id,
    },
  });

  // 7. Submetric: Electricity Heat
  const electricityHeatSubmetric = await prisma.disclosureSubmetric.create({
    data: {
      name: 'Electricity and Heat Generation',
      metricId: stationaryMetric.id,
    },
  });

  // 8. Submetric Details (The actual fields)
  await prisma.disclosureSubmetricDetail.createMany({
    data: [
      {
        submetricId: electricityHeatSubmetric.id,
        label: 'Diesel-Powered Generators',
        inputType: 'SOURCE_DATA_MAP' as any,
        required: true,
        options: {
          category: 'dieselGenerators',
          volumeLabel: 'Volume of Fuel Consumed',
          volumePlaceholder: 'Enter volume consumed',
        } as any,
      },
      {
        submetricId: electricityHeatSubmetric.id,
        label: 'Gas-Fired Turbines',
        inputType: 'SOURCE_DATA_MAP' as any,
        required: true,
        options: {
          category: 'gasTurbines',
          volumeLabel: 'Volume of Fuel Consumed',
          volumePlaceholder: 'Enter volume consumed',
        } as any,
      },
      {
        submetricId: electricityHeatSubmetric.id,
        label: 'Gas supply invoices from suppliers',
        inputType: 'FILE' as any,
        required: false,
      },
      {
        submetricId: electricityHeatSubmetric.id,
        label: 'Turbine operation logs (hours, efficiency)',
        inputType: 'FILE' as any,
        required: false,
      },
    ],
  });

  // Expanding to scope 2
  const scope2Subtopic = await prisma.disclosureSubtopic.create({
    data: {
      name: 'Scope 2',
      topicId: ghgTopic.id,
    },
  });

  const locationBasedMetric = await prisma.disclosureMetric.create({
    data: {
      name: 'Location-Based',
      subtopicId: scope2Subtopic.id,
    },
  });

  const purchasedElectricitySubmetric = await prisma.disclosureSubmetric.create({
    data: {
      name: 'Purchased Electricity',
      metricId: locationBasedMetric.id,
    },
  });

  await prisma.disclosureSubmetricDetail.create({
    data: {
      submetricId: purchasedElectricitySubmetric.id,
      label: 'Grid Electricity Consumption',
      inputType: 'NUMBER' as any,
      required: true,
      options: { unit: 'kWh' } as any,
    },
  });

  console.log('✅ Disclosure Hierarchy seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
