import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  try {
    await prisma.role.createMany({
      data: [
        { name: 'SUPER_ADMIN', description: 'Full system access' },
        {
          name: 'SUSTAINABILITY_MANAGER',
          description: 'Manages sustainability data',
        },
        { name: 'C_SUITE_EXEC', description: 'Executive level access' },
        { name: 'REGULATOR', description: 'Regulatory compliance access' },
        { name: 'INVESTOR', description: 'Investment analytics access' },
      ],
      skipDuplicates: true,
    });

    // Seed Permissions
    // await prisma.permission.createMany({
    //   data: [
    //     { name: 'SUPER_ADMIN', description: 'Full system access' },
    //     { name: 'ADMIN', description: 'Administrative privileges' },
    //     { name: 'SUB_ADMIN', description: 'Limited admin access' },
    //     { name: 'VIEWER', description: 'Read-only access' },
    //     { name: 'EDITOR', description: 'Content editing access' },
    //   ],
    //   skipDuplicates: true,
    // });

    // Create Super Admin
    const superAdminRole = await prisma.role.findUniqueOrThrow({
      where: { name: 'SUPER_ADMIN' },
    });

    // const superAdminPermission = await prisma.permission.findUniqueOrThrow({
    //   where: { name: 'SUPER_ADMIN' },
    // });

    const hashedPassword = await bcrypt.hash('Teasoo@2024', 10);
    await prisma.user.create({
      data: {
        email: 'admin@teasoo.com',
        password: hashedPassword,
        first_name: 'Teasoo',
        last_name: 'Admin',
        roleId: superAdminRole.id,
        permissionId: 1,
        status: 'APPROVED',
        company: 'Teasoo Consulting',
        company_id: 'TEASOO001',
      },
    });

    console.log('✅ Seeding completed successfully!');
    console.log('Super Admin credentials:');
    console.log('Email: admin@teasoo.com');
    console.log('Password: Teasoo@2024');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
