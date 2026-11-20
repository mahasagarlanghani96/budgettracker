import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Decimal from 'decimal.js';
import { prisma, DB_AVAILABLE, cleanupTestData, createTestUser, createTestAccount } from './db-helpers';
import { INFLOW_TYPES, OUTFLOW_TYPES } from '@/lib/calculations/balance';

describe.skipIf(!DB_AVAILABLE)('FIN-QA-0930: Balance invariants — database integration', () => {
  let userId: string;
  let accountId: string;
  const OPENING = 100000;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    const account = await createTestAccount(userId, {
      name: 'Balance Test',
      openingBalance: OPENING,
    });
    accountId = account.id;
  });

  afterAll(async () => {
    await cleanupTestData(userId);
    await prisma.$disconnect();
  });

  it('balance = opening + inflows - outflows after mixed transactions', async () => {
    await prisma.transaction.create({
      data: {
        userId,
        type: 'INCOME',
        amount: 50000,
        destAccountId: accountId,
        transactionDate: new Date('2024-01-10'),
      },
    });
    await prisma.transaction.create({
      data: {
        userId,
        type: 'EXPENSE',
        amount: 20000,
        sourceAccountId: accountId,
        transactionDate: new Date('2024-01-11'),
      },
    });
    await prisma.transaction.create({
      data: {
        userId,
        type: 'INCOME',
        amount: 15000,
        destAccountId: accountId,
        transactionDate: new Date('2024-01-12'),
      },
    });

    const inflowResult = await prisma.transaction.aggregate({
      where: {
        destAccountId: accountId,
        userId,
        isDeleted: false,
        isHistorical: false,
        type: { in: INFLOW_TYPES as any },
      },
      _sum: { amount: true },
    });

    const outflowResult = await prisma.transaction.aggregate({
      where: {
        sourceAccountId: accountId,
        userId,
        isDeleted: false,
        isHistorical: false,
        type: { in: OUTFLOW_TYPES as any },
      },
      _sum: { amount: true },
    });

    const inflows = new Decimal(inflowResult._sum?.amount?.toString() || '0');
    const outflows = new Decimal(outflowResult._sum?.amount?.toString() || '0');
    const balance = new Decimal(OPENING).plus(inflows).minus(outflows);

    expect(balance.toNumber()).toBe(145000);
  });

  it('deleted transactions are excluded from balance', async () => {
    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: 'INCOME',
        amount: 999999,
        destAccountId: accountId,
        transactionDate: new Date('2024-01-13'),
      },
    });

    await prisma.transaction.update({
      where: { id: tx.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    const inflowResult = await prisma.transaction.aggregate({
      where: {
        destAccountId: accountId,
        userId,
        isDeleted: false,
        isHistorical: false,
        type: { in: INFLOW_TYPES as any },
      },
      _sum: { amount: true },
    });

    const inflows = new Decimal(inflowResult._sum?.amount?.toString() || '0');
    expect(inflows.toNumber()).toBe(65000);
  });

  it('historical transactions are excluded from balance', async () => {
    await prisma.transaction.create({
      data: {
        userId,
        type: 'INCOME',
        amount: 888888,
        destAccountId: accountId,
        transactionDate: new Date('2024-01-14'),
        isHistorical: true,
      },
    });

    const inflowResult = await prisma.transaction.aggregate({
      where: {
        destAccountId: accountId,
        userId,
        isDeleted: false,
        isHistorical: false,
        type: { in: INFLOW_TYPES as any },
      },
      _sum: { amount: true },
    });

    const inflows = new Decimal(inflowResult._sum?.amount?.toString() || '0');
    expect(inflows.toNumber()).toBe(65000);
  });
});
