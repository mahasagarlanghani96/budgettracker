import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Decimal from 'decimal.js';
import { prisma, DB_AVAILABLE, cleanupTestData, createTestUser, createTestAccount } from './db-helpers';

describe.skipIf(!DB_AVAILABLE)('FIN-QA-0910: Transaction CRUD — database integration', () => {
  let userId: string;
  let accountId: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    const account = await createTestAccount(userId, { name: 'Main Account', openingBalance: 100000 });
    accountId = account.id;
  });

  afterAll(async () => {
    await cleanupTestData(userId);
    await prisma.$disconnect();
  });

  it('creates an INCOME transaction', async () => {
    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: 'INCOME',
        amount: 25000,
        destAccountId: accountId,
        transactionDate: new Date('2024-01-15'),
        description: 'Salary',
      },
    });
    expect(tx.type).toBe('INCOME');
    expect(new Decimal(tx.amount.toString()).toNumber()).toBe(25000);
  });

  it('creates an EXPENSE transaction', async () => {
    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: 'EXPENSE',
        amount: 5000,
        sourceAccountId: accountId,
        transactionDate: new Date('2024-01-16'),
        description: 'Groceries',
      },
    });
    expect(tx.type).toBe('EXPENSE');
  });

  it('creates a TRANSFER between accounts', async () => {
    const destAccount = await createTestAccount(userId, { name: 'Savings', accountType: 'BANK' });
    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: 'TRANSFER',
        amount: 10000,
        sourceAccountId: accountId,
        destAccountId: destAccount.id,
        transactionDate: new Date('2024-01-17'),
      },
    });
    expect(tx.sourceAccountId).toBe(accountId);
    expect(tx.destAccountId).toBe(destAccount.id);
  });

  it('soft-deletes a transaction', async () => {
    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: 'EXPENSE',
        amount: 100,
        sourceAccountId: accountId,
        transactionDate: new Date('2024-01-18'),
      },
    });
    const deleted = await prisma.transaction.update({
      where: { id: tx.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    expect(deleted.isDeleted).toBe(true);
  });

  it('aggregates inflows correctly', async () => {
    const result = await prisma.transaction.aggregate({
      where: {
        destAccountId: accountId,
        userId,
        isDeleted: false,
        type: { in: ['INCOME'] },
      },
      _sum: { amount: true },
    });
    expect(new Decimal(result._sum.amount?.toString() || '0').toNumber()).toBeGreaterThan(0);
  });

  it('amount stored with Decimal(18,2) precision', async () => {
    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: 'INCOME',
        amount: 99999999.99,
        destAccountId: accountId,
        transactionDate: new Date('2024-01-19'),
      },
    });
    expect(new Decimal(tx.amount.toString()).toFixed(2)).toBe('99999999.99');
  });
});
