import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Decimal from 'decimal.js';
import { prisma, DB_AVAILABLE, cleanupTestData, createTestUser, createTestAccount } from './db-helpers';

describe.skipIf(!DB_AVAILABLE)('FIN-QA-0900: Account CRUD — database integration', () => {
  let userId: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
  });

  afterAll(async () => {
    await cleanupTestData(userId);
    await prisma.$disconnect();
  });

  it('creates an account with opening balance', async () => {
    const account = await createTestAccount(userId, {
      name: 'Cash Wallet',
      openingBalance: 50000,
    });
    expect(account.name).toBe('Cash Wallet');
    expect(new Decimal(account.openingBalance.toString()).toNumber()).toBe(50000);
    expect(account.accountType).toBe('CASH');
  });

  it('creates multiple account types', async () => {
    const bank = await createTestAccount(userId, { name: 'Bank', accountType: 'BANK' });
    const wallet = await createTestAccount(userId, { name: 'Wallet', accountType: 'WALLET' });
    expect(bank.accountType).toBe('BANK');
    expect(wallet.accountType).toBe('WALLET');
  });

  it('retrieves all accounts for a user', async () => {
    const accounts = await prisma.account.findMany({ where: { userId } });
    expect(accounts.length).toBeGreaterThanOrEqual(3);
  });

  it('updates account name', async () => {
    const account = await createTestAccount(userId, { name: 'Old Name' });
    const updated = await prisma.account.update({
      where: { id: account.id },
      data: { name: 'New Name' },
    });
    expect(updated.name).toBe('New Name');
  });

  it('soft-deletes account by setting isActive to false', async () => {
    const account = await createTestAccount(userId, { name: 'To Delete' });
    const deleted = await prisma.account.update({
      where: { id: account.id },
      data: { isActive: false },
    });
    expect(deleted.isActive).toBe(false);
  });

  it('opening balance stored with Decimal(18,2) precision', async () => {
    const account = await createTestAccount(userId, {
      name: 'Precision Test',
      openingBalance: 123456789.99,
    });
    const fetched = await prisma.account.findUnique({ where: { id: account.id } });
    expect(new Decimal(fetched!.openingBalance.toString()).toFixed(2)).toBe('123456789.99');
  });
});
