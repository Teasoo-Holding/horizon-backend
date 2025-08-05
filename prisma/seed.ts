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
        { name: 'ADMIN_VIEWER', description: 'Read-only admin access' },
        { name: 'ADMIN_EDITOR', description: 'Data editing access' },
        { name: 'SUSTAINABILITY_MANAGER', description: 'The ESG admin' },
        { name: 'SUB_ADMIN', description: 'The ESG restricted admin' },
        { name: 'C_SUITE_EXEC', description: 'Executive level' },
        { name: 'REGULATOR', description: 'Regulatory compliance access' },
        { name: 'INVESTOR', description: 'Investment analytics access' },
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

    const permissions = [
      { name: 'can_add_user', description: 'User management access' },
      { name: 'can_add_department', description: 'Department management' },
      { name: 'can_input_data', description: 'Can input ESG data' },
      {
        name: 'can_generate_report',
        description: 'Generate analytics reports',
      },
    ];

    await prisma.permission.createMany({
      data: permissions,
      skipDuplicates: true,
    });

    const allPermissions = await prisma.permission.findMany();

    let adminUser = await prisma.user.findUnique({
      where: { email: 'admin@teasoo.com' },
    });

    if (!adminUser) {
      console.log('👤 Creating admin user...');
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@teasoo.com',
          password: await bcrypt.hash('Teasoo@2025', 10),
          first_name: 'Teasoo',
          last_name: 'Admin',
          role: { connect: { name: 'SUPER_ADMIN' } },
          company: { connect: { id: company.id } },
          status: 'APPROVED',
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

    // Create userPermissions
    const existingUserPermissions = await prisma.userPermission.findMany({
      where: { userId: adminUser.id },
    });

    const existingPermissionIds = new Set(
      existingUserPermissions.map((p) => p.permissionId),
    );

    const newPermissionsToAdd = allPermissions
      .filter((perm) => !existingPermissionIds.has(perm.id))
      .map((perm) => ({
        userId: adminUser.id,
        permissionId: perm.id,
      }));

    if (newPermissionsToAdd.length) {
      await prisma.userPermission.createMany({
        data: newPermissionsToAdd,
        skipDuplicates: true,
      });
      console.log(
        `🔐 Added ${newPermissionsToAdd.length} missing permissions to admin user.`,
      );
    } else {
      console.log('🔐 Admin user already has all permissions.');
    }

    // Subscriptions
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

// import { PrismaClient } from '@prisma/client';
// import * as bcrypt from 'bcryptjs';

// const prisma = new PrismaClient();

// async function main() {
//   try {
//     await prisma.role.createMany({
//       data: [
//         { name: 'SUPER_ADMIN', description: 'Full system access' },
//         { name: 'RESTRICTED_ADMIN', description: 'Limited admin access' },
//         { name: 'ADMIN_VIEWER', description: 'Read-only admin access' },
//         { name: 'ADMIN_EDITOR', description: 'Data editing access' },
//         { name: 'SUSTAINABILITY_MANAGER', description: 'The ESG admin' },
//         { name: 'SUB_ADMIN', description: 'The ESG restricted admin' },
//         { name: 'C_SUITE_EXEC', description: 'Executive level' },
//         { name: 'REGULATOR', description: 'Regulatory compliance access' },
//         { name: 'INVESTOR', description: 'Investment analytics access' },
//       ],
//       skipDuplicates: true,
//     });

//     const company = await prisma.company.upsert({
//       where: { name: 'Teasoo Consulting' },
//       update: {},
//       create: {
//         name: 'Teasoo Consulting',
//         registration_number: 'TEA12345',
//         industry_type: 'Advisory',
//         address: '123 Aso Villa',
//         contact_email: 'info@teasooconsulting.com',
//         contact_phone: '+2347038334703',
//         status: 'ACTIVE',
//         created_by: 1,
//         updated_by: 1,
//       },
//     });

//     // const company = await prisma.company.create({
//     //   data: {
//     //     name: 'Teasoo Consulting',
//     //     registration_number: 'TEA12345',
//     //     industry_type: 'Advisory',
//     //     address: '123 Aso Villa',
//     //     contact_email: 'info@teasooconsulting.com',
//     //     contact_phone: '+2347038334703',
//     //     status: 'ACTIVE',
//     //     created_by: 1,
//     //     updated_by: 1,
//     //   },
//     // });

//     const permissions = [
//       { name: 'can_add_user', description: 'User management access' },
//       { name: 'can_add_department', description: 'Department management' },
//       { name: 'can_input_data', description: 'Can input ESG data' },
//       {
//         name: 'can_generate_report',
//         description: 'Generate analytics reports',
//       },
//     ];
//     await prisma.permission.createMany({
//       data: permissions,
//       skipDuplicates: true,
//     });
//     const allPermissions = await prisma.permission.findMany();

//     const existingUser = await prisma.user.findUnique({
//       where: { email: 'admin@teasoo.com' },
//     });

//     if (!existingUser) {
//       const adminUser = await prisma.user.create({
//         data: {
//           email: 'admin@teasoo.com',
//           password: await bcrypt.hash('Teasoo@2025', 10),
//           first_name: 'Teasoo',
//           last_name: 'Admin',
//           role: { connect: { name: 'SUPER_ADMIN' } },
//           company: { connect: { id: company.id } },
//           status: 'APPROVED',
//         },
//       });

//       await prisma.company.update({
//         where: { id: company.id },
//         data: {
//           created_by: adminUser.id,
//           updated_by: adminUser.id,
//         },
//       });

//       await prisma.userPermission.createMany({
//         data: allPermissions.map((perm) => ({
//           userId: adminUser.id,
//           permissionId: perm.id,
//         })),
//         skipDuplicates: true,
//       });

//       await prisma.subscription.createMany({
//         data: [
//           {
//             name: 'Basic',
//             description: 'Core assessment tools and basic reporting',
//             price_monthly: 0,
//             price_annual: 0,
//             max_team_members: 3,
//             features: ['Core assessment tools', 'Basic reporting'],
//             created_by: adminUser.id,
//             updated_by: adminUser.id,
//           },
//           {
//             name: 'Standard',
//             description: 'Enhanced analytics and reporting',
//             price_monthly: 30,
//             price_annual: 300,
//             max_team_members: 10,
//             features: [
//               'Enhanced analytics',
//               'Additional team members',
//               'Expanded reporting',
//             ],
//             created_by: adminUser.id,
//             updated_by: adminUser.id,
//           },
//           {
//             name: 'Premium',
//             description: 'Advanced insights and AI recommendations',
//             price_monthly: 60,
//             price_annual: 600,
//             max_team_members: null,
//             features: [
//               'Advanced insights',
//               'AI recommendations',
//               'Unlimited team members',
//             ],
//             created_by: adminUser.id,
//             updated_by: adminUser.id,
//           },
//           {
//             name: 'Enterprise',
//             description:
//               'Custom integrations, dedicated support, advanced compliance tools',
//             price_monthly: 150,
//             price_annual: 1500,
//             discount: 0,
//             max_team_members: null,
//             features: [
//               'Custom integrations',
//               'Dedicated support',
//               'Advanced compliance tools',
//               'Security audit',
//               'Training sessions',
//               'Unlimited team members',
//             ],
//             created_by: adminUser.id,
//             updated_by: adminUser.id,
//           },
//         ],
//         skipDuplicates: true,
//       });
//     }

//     console.log('✅ Seeding completed successfully');
//   } catch (error) {
//     console.error('❌ Seeding failed:', error);
//     process.exit(1);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// main();
