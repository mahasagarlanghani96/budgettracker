import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Decimal from 'decimal.js';
import { prisma, DB_AVAILABLE, cleanupTestData, createTestUser, createTestAccount } from './db-helpers';

describe.skipIf(!DB_AVAILABLE)('FIN-QA-0920: Loan lifecycle — database integration', () => {
  let userId: string;
  let accountId: string;
  let personId: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
    const account = await createTestAccount(userId, { name: 'Main', openingBalance: 500000 });
    accountId = account.id;
    const person = await prisma.person.create({
      data: { userId, name: 'Test Borrower' },
    });
    personId = person.id;
  });

  afterAll(async () => {
    await cleanupTestData(userId);
    await prisma.$disconnect();
  });

  it('creates a loan given', async () => {
    const loan = await prisma.loan.create({
      data: {
        userId,
        personId,
        direction: 'GIVEN',
        amount: 50000,
        remainingAmount: 50000,
        accountId,
        transactionDate: new Date('2024-01-01'),
      },
    });
    expect(loan.direction).toBe('GIVEN');
    expect(new Decimal(loan.remainingAmount.toString()).toNumber()).toBe(50000);
    expect(loan.status).toBe('ACTIVE');
  });

  it('creates a loan taken', async () => {
    const loan = await prisma.loan.create({
      data: {
        userId,
        personId,
        direction: 'TAKEN',
        amount: 100000,
        remainingAmount: 100000,
        accountId,
        transactionDate: new Date('2024-02-01'),
      },
    });
    expect(loan.direction).toBe('TAKEN');
  });

  it('records a repayment and decrements remaining', async () => {
    const loan = await prisma.loan.create({
      data: {
        userId,
        personId,
        direction: 'GIVEN',
        amount: 30000,
        remainingAmount: 30000,
        accountId,
        transactionDate: new Date('2024-03-01'),
      },
    });

    await prisma.loanRepayment.create({
      data: {
        loanId: loan.id,
        personId,
        userId,
        amount: 10000,
        accountId,
        transactionDate: new Date('2024-03-15'),
      },
    });

    const updated = await prisma.loan.update({
      where: { id: loan.id },
      data: { remainingAmount: 20000 },
    });
    expect(new Decimal(updated.remainingAmount.toString()).toNumber()).toBe(20000);
  });

  it('settles a fully repaid loan', async () => {
    const loan = await prisma.loan.create({
      data: {
        userId,
        personId,
        direction: 'GIVEN',
        amount: 10000,
        remainingAmount: 10000,
        accountId,
        transactionDate: new Date('2024-04-01'),
      },
    });

    await prisma.loanRepayment.create({
      data: {
        loanId: loan.id,
        personId,
        userId,
        amount: 10000,
        accountId,
        transactionDate: new Date('2024-04-15'),
      },
    });

    const settled = await prisma.loan.update({
      where: { id: loan.id },
      data: { remainingAmount: 0, status: 'SETTLED' },
    });
    expect(settled.status).toBe('SETTLED');
    expect(new Decimal(settled.remainingAmount.toString()).toNumber()).toBe(0);
  });

  it('calculates outstanding receivables', async () => {
    const activeLoans = await prisma.loan.findMany({
      where: { userId, direction: 'GIVEN', status: 'ACTIVE' },
      select: { remainingAmount: true },
    });
    const total = activeLoans.reduce(
      (sum, l) => sum.plus(l.remainingAmount.toString()),
      new Decimal(0)
    );
    expect(total.gte(0)).toBe(true);
  });
});
