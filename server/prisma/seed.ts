import { PrismaClient, Role, ClaimStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean up existing data (Optional: prevents duplicate key errors)
  await prisma.user.updateMany({ data: { managerId: null } });
  await prisma.claim.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.payoutBatch.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.policyRule.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  const superadmin = await prisma.user.create({
    data: {
      name: 'Platform Superadmin',
      email: 'superadmin@example.com',
      password: hashedPassword,
      role: Role.SUPERADMIN,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Finance Admin',
      email: 'finance.admin@example.com',
      password: hashedPassword,
      role: Role.FINANCE_ADMIN,
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      name: 'Aadrita Chakraborty',
      email: 'aadrita@gmail.com',
      password: hashedPassword,
      role: Role.MANAGER,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      name: 'Anuj Thapa',
      email: 'anuj@gmail.com',
      password: hashedPassword,
      role: Role.MANAGER,
    },
  });

  const employee1 = await prisma.user.create({
    data: {
      name: 'Rohan Sharma',
      email: 'rohan@gmail.com',
      password: hashedPassword,
      role: Role.EMPLOYEE,
      managerId: manager1.id,
    },
  });

  const employee2 = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'priya@gmail.com',
      password: hashedPassword,
      role: Role.EMPLOYEE,
      managerId: manager1.id,
    },
  });

  const hod1 = await prisma.user.create({
    data: {
      name: 'Arpit Sahu',
      email: 'arpit@gmail.com',
      password: hashedPassword,
      role: Role.HOD,
    },
  });

  const hod2 = await prisma.user.create({
    data: {
      name: 'Harsh Kakkar',
      email: 'harsh@gmail.com',
      password: hashedPassword,
      role: Role.HOD,
    },
  })

  await prisma.department.createMany({
    data: [
      {
        name: 'Engineering',
        code: 'ENG',
        budget: 500000,
        hodId: hod1.id,
      },
      {
        name: 'Sales',
        code: 'SALES',
        budget: 300000,
        hodId: hod2.id,
      },
    ],
  });

  await prisma.policyRule.createMany({
    data: [
      {
        category: 'Travel',
        maxLimit: 50000,
        requireReceipt: true,
        requireGstin: false,
      },
      {
        category: 'Meals',
        maxLimit: 10000,
        requireReceipt: true,
        requireGstin: true,
      },
    ],
  });

  await prisma.claim.createMany({
    data: [
      {
        title: 'Team Dinner - Q3 Kickoff',
        amount: 3450.0,
        receiptUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
        status: ClaimStatus.PENDING,
        employeeId: employee1.id,
      },
      {
        title: 'Client Uber Travel',
        amount: 680.0,
        receiptUrl: 'https://images.unsplash.com/photo-1512100356356-de1b84283e18',
        status: ClaimStatus.APPROVED,
        employeeId: employee1.id,
        reviewerId: manager1.id,
        reviewComment: 'Valid travel expense. Approved.',
      },
      {
        title: 'AWS Server Credit Top-up',
        amount: 12500.0,
        receiptUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
        status: ClaimStatus.PENDING,
        employeeId: employee2.id,
      },
      {
        title: 'Manager Office Supplies',
        amount: 1200.0,
        receiptUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd',
        status: ClaimStatus.PENDING,
        employeeId: manager2.id,
      },
    ],
  });

  console.log(`Seeded superadmin ${superadmin.email}`);
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });