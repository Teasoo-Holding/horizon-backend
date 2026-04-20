import {
  CompanyStatus,
  CompanyType,
  PrismaClient,
  UserStatus,
} from '@prisma/client';
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
            "Grants the highest level of authority over the ESG-Horizon platform. Intended for key personnel responsible for the system's integrity, this role provides unrestricted access and should be assigned with extreme caution.",
        },
        {
          name: 'platform_subadmin',
          description:
            'Manages the day-to-day administrative and content oversight tasks within the platform. This role has powerful permissions to manage organizational data and the ESG submission lifecycle.',
        },
        {
          name: 'platform_data_officer',
          description:
            'Responsible for submitting timely and accurate ESG data and monitoring performance through reports. Data officers have the necessary reporting access to understand the impact of their contributions.',
        },
        {
          name: 'platform_viewer',
          description:
            'Provides read-only access to all dashboards and reports across the platform. This role is ideal for stakeholders who require visibility into ESG performance without needing to edit data.',
        },
        {
          name: 'company_esg_admin',
          description:
            'The primary administrator responsible for managing all users, settings, and ESG data for their specific company. This role has full administrative rights, but strictly within their own organization ONLY.',
        },
        {
          name: 'company_esg_subadmin',
          description:
            "Responsible for reviewing, editing, and approving all ESG data submissions for their company. This role ensures the quality and accuracy of the company's data.Their access is limited to their own company's data and reports.",
        },
        {
          name: 'company_esg_data_officer',
          description:
            "The primary role for ensuring the ESG-Horizon platform is populated with accurate, up-to-date information. Contributors are the primary users responsible for the day-to-day entry and management of their company's ESG data.",
        },
        {
          name: 'company_esg_viewer',
          description:
            'Provides read-only access to all ESG dashboards and reports to stakeholders who require a comprehensive overview of their company’s ESG performance. ',
        },
      ],
      skipDuplicates: true,
    });
    console.log('✅ Roles seeded.');

    // Declare role aliases before they are used
    const roleEmailAliases: { [key: string]: string } = {
      super_admin: 'sa',
      platform_subadmin: 'psa',
      platform_data_officer: 'pdo',
      platform_viewer: 'pv',
      company_esg_admin: 'ca',
      company_esg_subadmin: 'csa',
      company_esg_data_officer: 'cdo',
      company_esg_viewer: 'cv',
    };

    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'super_admin' },
    });
    if (!superAdminRole) {
      throw new Error(
        'Super Admin role not found. Cannot proceed with seeding.',
      );
    }

    // 2. Create the super_admin user first
    const passwordHash = await bcrypt.hash('password123', 10);
    const superAdminUser = await prisma.user.upsert({
      where: { email: roleEmailAliases.super_admin + '@teasoo.com' },
      update: {},
      create: {
        email: roleEmailAliases.super_admin + '@teasoo.com',
        password: passwordHash,
        first_name: 'Super Admin',
        last_name: 'User',
        roleId: superAdminRole.id,
        status: UserStatus.active,
      },
    });
    console.log(
      `👤 Created or updated super admin user: ${superAdminUser.email}`,
    );

    // 3. Create or find default companies using the super admin's ID
    const teasooCompany = await prisma.company.upsert({
      where: { name: 'Teasoo Consulting' },
      update: {},
      create: {
        name: 'Teasoo Consulting',
        registration_number: 'TEA12345',
        industry: {
          connectOrCreate: {
            where: {
              sector_industry: { sector: 'Services', industry: 'Advisory' },
            },
            create: { sector: 'Services', industry: 'Advisory' },
          },
        },
        isoCountryCode: 'NG',
        address: '123 Aso Villa',
        country: 'Nigeria',
        website: 'https://teasooconsulting.com',
        contact_email: 'info@teasooconsulting.com',
        contact_phone: '+2347038334703',
        status: CompanyStatus.active,
        creator: {
          connect: { id: superAdminUser.id },
        },
        updater: {
          connect: { id: superAdminUser.id },
        },
      } as any,
    });

    const horizonCompany = await prisma.company.upsert({
      where: { name: 'Horizon ESG Solutions' },
      update: {},
      create: {
        name: 'Horizon ESG Solutions',
        registration_number: 'HZN7890',
        industry: {
          connectOrCreate: {
            where: {
              sector_industry: { sector: 'Technology', industry: 'Software' },
            },
            create: { sector: 'Technology', industry: 'Software' },
          },
        },
        isoCountryCode: 'US',
        address: '456 Tech Avenue',
        country: 'USA',
        website: 'https://horizonesg.com',
        contact_email: 'info@horizonesg.com',
        contact_phone: '+18005551234',
        status: CompanyStatus.active,
        creator: {
          connect: { id: superAdminUser.id },
        },
        updater: {
          connect: { id: superAdminUser.id },
        },
        company_type: CompanyType.esg,
      } as any,
    });
    console.log('✅ Companies seeded.');

    // 4. Update the super admin user with their company ID
    await prisma.user.update({
      where: { id: superAdminUser.id },
      data: { companyId: teasooCompany.id },
    });
    console.log(`✅ Super admin user's company set to: ${teasooCompany.name}`);

    // 5. Create a user for each role persona
    const roles = await prisma.role.findMany();
    const passwordHashForAllUsers = await bcrypt.hash('password123', 10);

    for (const role of roles) {
      if (role.name === 'super_admin') {
        continue;
      }

      const isPlatformRole =
        role.name.startsWith('platform') || role.name === 'super_admin';
      const company = isPlatformRole ? teasooCompany : horizonCompany;
      const email = `${roleEmailAliases[role.name]}@teasoo.com`;

      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          password: passwordHashForAllUsers,
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
    }

    // 6. Seed other data (subsidiaries, subscriptions, industries)
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

    // 7. Seed Sample Companies and Billing Data (for UI demonstration)
    if (superAdminUser) {
      const demoCompanies = [
        {
          name: 'EcoFriendly Manufacturing',
          sector: 'Industrial',
          industry: 'Manufacturing',
          plan: 'Enterprise',
          cycle: 'YEARLY',
          amount: 38800,
          status: 'ACTIVE',
        },
        {
          name: 'GreenTech Solutions',
          sector: 'Technology',
          industry: 'Renewable Energy',
          plan: 'Premium',
          cycle: 'YEARLY',
          amount: 15600,
          status: 'ACTIVE',
        },
        {
          name: 'Sustain Invest Capital',
          sector: 'Financials',
          industry: 'Investment Banking',
          plan: 'Free',
          cycle: 'MONTHLY',
          amount: 0,
          status: 'ACTIVE',
        },
        {
          name: 'BlueEarth Corp',
          sector: 'Industrial',
          industry: 'Environmental Services',
          plan: 'Basic',
          cycle: 'MONTHLY',
          amount: 7500,
          status: 'EXPIRED',
        },
      ];

      for (const demo of demoCompanies) {
        const company = await prisma.company.upsert({
          where: { name: demo.name },
          update: {},
          create: {
            name: demo.name,
            status: CompanyStatus.active,
            industry: {
              connectOrCreate: {
                where: {
                  sector_industry: { sector: demo.sector, industry: demo.industry },
                },
                create: { sector: demo.sector, industry: demo.industry },
              },
            },
            creator: { connect: { id: superAdminUser.id } },
          } as any,
        });

        const plan = await prisma.subscription.findUnique({
          where: { name: demo.plan },
        });

        if (plan) {
          const companySub = await prisma.companySubscription.create({
            data: {
              company_id: company.id,
              subscription_id: plan.id,
              start_date: new Date('2024-01-01'),
              status: demo.status as any,
              billing_cycle: demo.cycle as any,
              amount: demo.amount,
              auto_renew: true,
              created_by: superAdminUser.id,
              updated_by: superAdminUser.id,
            },
          });

          // Create invoice history for this company
          await prisma.invoice.create({
            data: {
              invoice_id: `PMT-${Date.now()}-${company.id}`,
              company_id: company.id,
              amount: demo.amount,
              status: demo.status === 'EXPIRED' ? 'PENDING' : 'PAID',
              billing_date: new Date('2024-01-01'),
              next_payment_date: new Date('2025-01-01'),
            },
          });
        }
      }
      console.log('✅ Demo companies and billing data seeded.');
    }

    // 8. Seed Permission Groups and Permissions
    const permissionGroups = [
      {
        name: 'User Management',
        permissions: [
          { key: 'invite_users', label: 'Invite users' },
          { key: 'edit_profile', label: 'Edit user profile' },
          { key: 'suspend_user', label: 'Suspend user' },
          { key: 'delete_user', label: 'Delete user' },
          { key: 'assign_roles', label: 'Assign roles' },
        ],
      },
      {
        name: 'Data & Reports',
        permissions: [
          { key: 'view_reports', label: 'View reports' },
          { key: 'export_reports', label: 'Export reports' },
          { key: 'submit_data', label: 'Submit data' },
          { key: 'approve_reports', label: 'Approve reports' },
          { key: 'lock_data', label: 'Lock data' },
        ],
      },
      {
        name: 'Company Mgmt',
        permissions: [
          { key: 'view_companies', label: 'View companies' },
          { key: 'approve_company', label: 'Approve company' },
          { key: 'suspend_company', label: 'Suspend company' },
          { key: 'delete_company', label: 'Delete company' },
        ],
      },
      {
        name: 'Platform Config',
        permissions: [
          { key: 'view_algorithm', label: 'View algorithm' },
          { key: 'edit_algorithm', label: 'Edit algorithm' },
          { key: 'publish_algorithm', label: 'Publish algorithm' },
          { key: 'manage_pillars', label: 'Manage pillars' },
          { key: 'edit_assessments_config', label: 'Edit assessments config' },
        ],
      },
    ];

    console.log('🌱 Seeding permissions...');
    for (const group of permissionGroups) {
      const createdGroup = await prisma.permissionGroup.upsert({
        where: { name: group.name },
        update: {},
        create: { name: group.name },
      });

      for (const perm of group.permissions) {
        await prisma.permission.upsert({
          where: { key: perm.key },
          update: { label: perm.label, groupId: createdGroup.id },
          create: {
            key: perm.key,
            label: perm.label,
            groupId: createdGroup.id,
          },
        });
      }
    }

    // 9. Assign Permissions to Roles (Permission Matrix)
    const allPermissions = await prisma.permission.findMany();
    const roles_list = await prisma.role.findMany();

    const superAdmin = roles_list.find((r) => r.name === 'super_admin');
    const subAdmin = roles_list.find((r) => r.name === 'platform_subadmin');
    const dataOfficer = roles_list.find((r) => r.name === 'platform_data_officer');
    const viewer = roles_list.find((r) => r.name === 'platform_viewer');

    if (superAdmin) {
      console.log('👑 Assigning all permissions to Super Admin...');
      for (const p of allPermissions) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: p.id } },
          update: {},
          create: { roleId: superAdmin.id, permissionId: p.id },
        });
      }
    }

    if (subAdmin) {
      console.log('⚡ Assigning permissions to Sub Admin...');
      const subAdminPermissions = allPermissions.filter((p) => 
        !['delete_user', 'publish_algorithm', 'delete_company'].includes(p.key)
      );
      for (const p of subAdminPermissions) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: subAdmin.id, permissionId: p.id } },
          update: {},
          create: { roleId: subAdmin.id, permissionId: p.id },
        });
      }
    }

    if (viewer) {
      console.log('👁️ Assigning read-only permissions to Viewer...');
      const viewerPermissions = allPermissions.filter((p) => p.key.startsWith('view_'));
      for (const p of viewerPermissions) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: viewer.id, permissionId: p.id } },
          update: {},
          create: { roleId: viewer.id, permissionId: p.id },
        });
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