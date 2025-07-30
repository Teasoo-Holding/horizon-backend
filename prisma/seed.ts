import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.role.createMany({
      data: [
        { name: 'SUPER_ADMIN', description: 'Full system access' },
        { name: 'RESTRICTED_ADMIN', description: 'Limited admin access' },
        { name: 'ADMIN_VIEWER', description: 'Read-only admin access' },
        { name: 'ADMIN_EDITOR', description: 'Data editing access' },
        { name: 'SUSTAINABILITY_MANAGER', description: 'The ESG admin' },
        { name: 'C_SUITE_EXEC', description: 'Executive level' },
        { name: 'REGULATOR', description: 'Regulatory compliance access' },
        { name: 'INVESTOR', description: 'Investment analytics access' },
      ],
      skipDuplicates: true,
    });

    const company = await prisma.company.create({
      data: {
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

    const fullPermissions = await prisma.permission.create({
      data: {
        can_add_user: true,
        can_add_department: true,
        can_input_data: true,
        can_generate_report: true,
      },
    });

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@teasoo.com',
        password: await bcrypt.hash('Teasoo@2025', 10),
        first_name: 'Teasoo',
        last_name: 'Admin',
        role: { connect: { name: 'SUPER_ADMIN' } },
        permission: { connect: { id: fullPermissions.id } },
        status: 'APPROVED',
        company: {
          connect: {
            id: company.id,
          },
        },
      },
    });

    await prisma.company.update({
      where: { id: company.id },
      data: {
        created_by: adminUser.id,
        updated_by: adminUser.id,
      },
    });

    await prisma.subscription.createMany({
      data: [
        {
          name: 'Basic',
          description: 'Core assessment tools and basic reporting',
          price_monthly: 0,
          price_annual: 0,
          max_team_members: 3,
          features: ['Core assessment tools', 'Basic reporting'],
          created_by: adminUser.id,
          updated_by: adminUser.id,
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
          created_by: adminUser.id,
          updated_by: adminUser.id,
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
          created_by: adminUser.id,
          updated_by: adminUser.id,
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
          created_by: adminUser.id,
          updated_by: adminUser.id,
        },
      ],
      skipDuplicates: true,
    });

    console.log('✅ Seeding completed');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
