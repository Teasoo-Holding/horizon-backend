import { CompanyStatus, PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    await prisma.role.createMany({
      data: [
        {
          name: 'super_admin',
          description:
            'Product owner with full control over the platform. Can manage platform-wide settings, companies, departments, user accounts, and all data.',
        },
        {
          name: 'platform_subadmin',
          description:
            'Editor with elevated rights — can validate/approve ESG submissions, edit company/dept/user info (except Super Admin account), and view all reports.',
        },
        {
          name: 'platform_data_officer',
          description:
            'Contributor who can input data (quantitative/qualitative), update existing records, and view reports',
        },
        {
          name: 'platform_viewer',
          description:
            'View-only role for executives or stakeholders (“Ogas”) — can see dashboards, reports, and analytics but cannot edit.',
        },
        {
          name: 'company_esg_admin',
          description:
            'Company owner account. Can manage their company profile, departments, ESG-specific settings, and assign ESG sub-user roles. Full rights for their company only.',
        },
        {
          name: 'company_esg_subadmin',
          description:
            'Editor with rights to validate/approve ESG submissions within their company, edit data entries, and view all company reports.',
        },
        {
          name: 'company_esg_data_officer',
          description:
            'Contributor who inputs ESG data and updates records for their company, with view access to reports',
        },
        {
          name: 'company_esg_viewer',
          description:
            'View-only role for company executives (C-suite “Ogas”) — can access ESG dashboards and reports but cannot modify data.',
        },
      ],
      skipDuplicates: true,
    });

    const company = await prisma.company.upsert({
      where: { name: 'Teasoo Consulting' },
      update: {},
      create: {
        name: 'Teasoo Consulting',
        registration_number: 'TEA12345',
        sicsCode: "0",
        industry: 'Advisory',
        isoCountryCode: 'NG',
        address: '123 Aso Villa',
        country: "Nigeria",
        website: 'https://teasooconsulting.com',
        contact_email: 'info@teasooconsulting.com',
        contact_phone: '+2347038334703',
        status: CompanyStatus.active,
        created_by: 1,
        updated_by: 1,
      },
    });

    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin@teasoo.com' },
    });

    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'super_admin' },
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
          status: UserStatus.active
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
