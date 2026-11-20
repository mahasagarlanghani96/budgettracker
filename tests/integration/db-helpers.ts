import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const DB_AVAILABLE = !!process.env.DATABASE_URL;

export async function cleanupTestData(userId: string) {
  if (!DB_AVAILABLE) return;
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.loanRepayment.deleteMany({ where: { userId } });
  await prisma.loan.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.category.deleteMany({ where: { userId } });
  await prisma.person.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

let counter = 0;

export async function createTestUser() {
  const unique = `${Date.now()}_${process.pid}_${++counter}`;
  return prisma.user.create({
    data: {
      name: 'Integration Test User',
      email: `integration_${unique}@test.local`,
      passwordHash: '$2a$10$placeholder',
    },
  });
}

export async function createTestAccount(userId: string, overrides: Record<string, unknown> = {}) {
  return prisma.account.create({
    data: {
      userId,
      name: 'Test Account',
      accountType: 'CASH',
      openingBalance: 0,
      ...overrides,
    },
  });
}
