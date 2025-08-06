import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    await prisma.role.createMany({
      data: [
        { name: 'SUPER_ADMIN', description: 'Full system access' },
        { name: 'RESTRICTED_ADMIN', description: 'Limited admin access' },
        { name: 'ADMIN_EDITOR', description: 'Data editing access' },
        { name: 'ADMIN_VIEWER', description: 'Read-only admin access' },
        { name: 'ESG_ADMIN', description: 'The ESG admin' },
        { name: 'ESG_SUB_ADMIN', description: 'The ESG restricted admin' },
        { name: 'ESG_EDITOR', description: 'Executive level' },
        { name: 'ESG_VIEWER', description: 'Regulatory compliance access' },
      ],
      skipDuplicates: true,
    });

    const company = await prisma.company.upsert({
      where: { name: 'Teasoo Consulting' },
      update: {},
      create: {
        name: 'Teasoo Consulting',
        registration_number: 'TEA12345',
        industry_type: 'Advisory',
        address: '123 Aso Villa',
        contact_email: 'info@teasooconsulting.com',
        contact_phone: '+2347038334703',
        status: 'ACTIVE',
        created_by: 1,
        updated_by: 1,
      },
    });

    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin@teasoo.com' },
    });

    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'SUPER_ADMIN' },
    });

    if (!adminUser) {
      console.log('👤 Creating admin user...');
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@teasoo.com',
          password: await bcrypt.hash('Teasoo@2025', 10),
          first_name: 'Teasoo',
          last_name: 'Admin',
          roleId: superAdminRole!.id,
          companyId: company.id,
          status: 'APPROVED',
          accessLevel: 'SUPER_ADMIN',
        },
      });

      await prisma.company.update({
        where: { id: company.id },
        data: {
          created_by: adminUser.id,
          updated_by: adminUser.id,
        },
      });

      console.log('✅ Admin user created.');
    } else {
      console.log('⚠️ Admin user already exists. Skipping creation.');
    }

    const subscriptions = [
      {
        name: 'Basic',
        description: 'Core assessment tools and basic reporting',
        price_monthly: 0,
        price_annual: 0,
        max_team_members: 3,
        features: ['Core assessment tools', 'Basic reporting'],
      },
      {
        name: 'Standard',
        description: 'Enhanced analytics and reporting',
        price_monthly: 30,
        price_annual: 300,
        max_team_members: 10,
        features: [
          'Enhanced analytics',
          'Additional team members',
          'Expanded reporting',
        ],
      },
      {
        name: 'Premium',
        description: 'Advanced insights and AI recommendations',
        price_monthly: 60,
        price_annual: 600,
        max_team_members: null,
        features: [
          'Advanced insights',
          'AI recommendations',
          'Unlimited team members',
        ],
      },
      {
        name: 'Enterprise',
        description:
          'Custom integrations, dedicated support, advanced compliance tools',
        price_monthly: 150,
        price_annual: 1500,
        discount: 0,
        max_team_members: null,
        features: [
          'Custom integrations',
          'Dedicated support',
          'Advanced compliance tools',
          'Security audit',
          'Training sessions',
          'Unlimited team members',
        ],
      },
    ];

    for (const sub of subscriptions) {
      const existing = await prisma.subscription.findUnique({
        where: { name: sub.name },
      });

      if (!existing) {
        await prisma.subscription.create({
          data: {
            ...sub,
            created_by: adminUser.id,
            updated_by: adminUser.id,
          },
        });
        console.log(`📦 Created subscription: ${sub.name}`);
      } else {
        console.log(`📦 Subscription already exists: ${sub.name}`);
      }
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
