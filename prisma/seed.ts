import { CompanyStatus, CompanyType, PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { industries } from './industries';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for user personas...');

  try {
    // 1. Create all predefined roles
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

    console.log('✅ Roles seeded.');

    // 2. Create or find default companies
    const teasooCompany = await prisma.company.upsert({
      where: { name: 'Teasoo Consulting' },
      update: {},
      create: {
        name: 'Teasoo Consulting',
        registration_number: 'TEA12345',
        industry: {
          connectOrCreate: {
            where: {
              sector_industry: {
                sector: 'Services',
                industry: 'Advisory',
              },
            },
            create: {
              sector: 'Services',
              industry: 'Advisory',
            },
          },
        },
        isoCountryCode: 'NG',
        address: '123 Aso Villa',
        country: 'Nigeria',
        website: 'https://teasooconsulting.com',
        contact_email: 'info@teasooconsulting.com',
        contact_phone: '+2347038334703',
        status: CompanyStatus.active,
        created_by: 1,
        updated_by: 1,
      },
    });

    // Create a separate company for ESG user personas
    const horizonCompany = await prisma.company.upsert({
      where: { name: 'Horizon ESG Solutions' },
      update: {},
      create: {
        name: 'Horizon ESG Solutions',
        registration_number: 'HZN7890',
        industry: {
          connectOrCreate: {
            where: {
              sector_industry: {
                sector: 'Technology',
                industry: 'Software',
              },
            },
            create: {
              sector: 'Technology',
              industry: 'Software',
            },
          },
        },
        isoCountryCode: 'US',
        address: '456 Tech Avenue',
        country: 'USA',
        website: 'https://horizonesg.com',
        contact_email: 'info@horizonesg.com',
        contact_phone: '+18005551234',
        status: CompanyStatus.active,
        created_by: 1,
        updated_by: 1,
        company_type: CompanyType.esg
      },
    });
    console.log('✅ Companies seeded.');

    // 3. Create a user for each role persona
    const roles = await prisma.role.findMany();
    const passwordHash = await bcrypt.hash('password123', 10);

    const roleEmailAliases = {
      super_admin: 'sa',
      platform_subadmin: 'psa',
      platform_data_officer: 'pdo',
      platform_viewer: 'pv',
      company_esg_admin: 'ca',
      company_esg_subadmin: 'csa',
      company_esg_data_officer: 'cdo',
      company_esg_viewer: 'cv',
    };

    for (const role of roles) {
      // Determine which company to associate the user with
      const isPlatformRole =
        role.name.startsWith('platform') || role.name === 'super_admin';
      const company = isPlatformRole ? teasooCompany : horizonCompany;
      const email = `${roleEmailAliases[role.name]}@teasoo.com`;

      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          password: passwordHash,
          first_name: role.name
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          last_name: 'User',
          roleId: role.id,
          companyId: company.id,
          status: UserStatus.active,
        },
      });
      console.log(
        `👤 Created or updated user for role: ${role.name} (${user.email})`,
      );

      // Update company created_by/updated_by for Teasoo if not already set
      if (role.name === 'super_admin') {
        await prisma.company.update({
          where: { id: teasooCompany.id },
          data: {
            created_by: user.id,
            updated_by: user.id,
          },
        });
        await prisma.company.update({
          where: { id: horizonCompany.id },
          data: {
            created_by: user.id,
            updated_by: user.id,
          },
        });
      }
    }

    // 4. Seed other data (subsidiaries, subscriptions, industries)
    const superAdminUser = await prisma.user.findFirst({
      where: { email: roleEmailAliases['super_admin'] + '@teasoo.com' },
    });
    if (superAdminUser) {
      const subsidiary = await prisma.subsidiary.upsert({
        where: {
          name_parentCompanyId: {
            name: 'Teasoo Consulting West Africa',
            parentCompanyId: teasooCompany.id,
          },
        },
        update: {},
        create: {
          name: 'Teasoo Consulting West Africa',
          registration_number: 'TEA-WA-001',
          sicsCode: '8720',
          isinCode: 'NGTEA001',
          isoCountryCode: 'NG',
          industry: {
            connectOrCreate: {
              where: {
                sector_industry: {
                  sector: 'Services',
                  industry: 'Advisory',
                },
              },
              create: {
                sector: 'Services',
                industry: 'Advisory',
              },
            },
          },
          address: '456 Victoria Island',
          country: 'Nigeria',
          currency: 'NGN',
          contact_email: 'westafrica@teasooconsulting.com',
          website: 'https://teasooconsulting.com/west-africa',
          contact_phone: '+2347038334704',
          company_logo_url: null,
          status: CompanyStatus.active,
          created_by: superAdminUser.id,
          updated_by: superAdminUser.id,
          parentCompany: {
            connect: {
              id: teasooCompany.id,
            },
          },
          teamLead: {
            connect: {
              id: superAdminUser.id,
            },
          },
        },
      });
      console.log(`✅ Subsidiary created: ${subsidiary.name}`);
    }

    // Create subscriptions
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

    if (superAdminUser) {
      for (const sub of subscriptions) {
        await prisma.subscription.upsert({
          where: { name: sub.name },
          update: {},
          create: {
            ...sub,
            created_by: superAdminUser.id,
            updated_by: superAdminUser.id,
          },
        });
        console.log(`📦 Created or updated subscription: ${sub.name}`);
      }
    }

    // Create industries
    for (const ind of industries) {
      await prisma.industry.upsert({
        where: {
          sector_industry: {
            sector: ind.sector,
            industry: ind.industry,
          },
        },
        update: {},
        create: ind,
      });
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
