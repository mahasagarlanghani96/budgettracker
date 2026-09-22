import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@budgettracker.com' },
    update: {},
    create: {
      email: 'demo@budgettracker.com',
      name: 'Demo User',
      passwordHash: hashedPassword,
      currency: 'PKR',
    },
  });
  console.log(`✅ User created: ${user.email}`);

  // Create default categories (field is "group", not "type")
  const incomeCategories = ['Salary', 'Freelance', 'Business Income', 'Rental Income', 'Interest', 'Other Income'];
  const expenseCategories = [
    'Food & Dining', 'Groceries', 'Transport', 'Fuel', 'Utilities', 'Rent',
    'Healthcare', 'Education', 'Shopping', 'Entertainment', 'Personal Care',
    'Mobile & Internet', 'Household', 'Other Expense',
  ];

  for (const name of incomeCategories) {
    await prisma.category.upsert({
      where: { userId_name_group: { userId: user.id, name, group: 'INCOME' } },
      update: {},
      create: { userId: user.id, name, group: 'INCOME', icon: '💰' },
    });
  }
  for (const name of expenseCategories) {
    await prisma.category.upsert({
      where: { userId_name_group: { userId: user.id, name, group: 'EXPENSE' } },
      update: {},
      create: { userId: user.id, name, group: 'EXPENSE', icon: '💸' },
    });
  }
  console.log('✅ Categories created');

  // Create accounts (openingDate now has a default, but let's be explicit)
  const now = new Date();
  const cashAccount = await prisma.account.create({
    data: { userId: user.id, name: 'Cash Wallet', accountType: 'CASH', openingBalance: 50000, openingDate: now, currency: 'PKR' },
  });
  const bankAccount = await prisma.account.create({
    data: { userId: user.id, name: 'HBL Savings', accountType: 'BANK', openingBalance: 200000, openingDate: now, currency: 'PKR' },
  });
  const mobileAccount = await prisma.account.create({
    data: { userId: user.id, name: 'JazzCash', accountType: 'WALLET', openingBalance: 5000, openingDate: now, currency: 'PKR' },
  });
  console.log('✅ Accounts created');

  // Fetch categories for transactions
  const salaryCategory = await prisma.category.findFirst({ where: { userId: user.id, name: 'Salary' } });
  const groceriesCategory = await prisma.category.findFirst({ where: { userId: user.id, name: 'Groceries' } });
  const transportCategory = await prisma.category.findFirst({ where: { userId: user.id, name: 'Transport' } });
  const utilitiesCategory = await prisma.category.findFirst({ where: { userId: user.id, name: 'Utilities' } });
  const foodCategory = await prisma.category.findFirst({ where: { userId: user.id, name: 'Food & Dining' } });
  const freelanceCategory = await prisma.category.findFirst({ where: { userId: user.id, name: 'Freelance' } });

  // Create sample transactions (uses sourceAccountId, not accountId)
  const transactions = [
    { userId: user.id, sourceAccountId: bankAccount.id, type: 'INCOME' as const, amount: 150000, description: 'Monthly Salary - September', categoryId: salaryCategory!.id, transactionDate: new Date(now.getFullYear(), now.getMonth(), 1) },
    { userId: user.id, sourceAccountId: bankAccount.id, type: 'INCOME' as const, amount: 35000, description: 'Freelance web project', categoryId: freelanceCategory!.id, transactionDate: new Date(now.getFullYear(), now.getMonth(), 5) },
    { userId: user.id, sourceAccountId: cashAccount.id, type: 'EXPENSE' as const, amount: 8500, description: 'Weekly groceries', categoryId: groceriesCategory!.id, transactionDate: new Date(now.getFullYear(), now.getMonth(), 3) },
    { userId: user.id, sourceAccountId: cashAccount.id, type: 'EXPENSE' as const, amount: 2500, description: 'Petrol', categoryId: transportCategory!.id, transactionDate: new Date(now.getFullYear(), now.getMonth(), 4) },
    { userId: user.id, sourceAccountId: bankAccount.id, type: 'EXPENSE' as const, amount: 12000, description: 'Electricity bill', categoryId: utilitiesCategory!.id, transactionDate: new Date(now.getFullYear(), now.getMonth(), 7) },
    { userId: user.id, sourceAccountId: cashAccount.id, type: 'EXPENSE' as const, amount: 3500, description: 'Restaurant dinner', categoryId: foodCategory!.id, transactionDate: new Date(now.getFullYear(), now.getMonth(), 9) },
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({ data: tx });
  }

  // Transfer: Bank -> Cash
  await prisma.transaction.create({
    data: {
      userId: user.id,
      sourceAccountId: bankAccount.id,
      destAccountId: cashAccount.id,
      type: 'TRANSFER',
      amount: 20000,
      description: 'Cash withdrawal',
      transactionDate: new Date(now.getFullYear(), now.getMonth(), 2),
    },
  });
  console.log('✅ Transactions created');

  // Create persons
  const person1 = await prisma.person.create({
    data: { userId: user.id, name: 'Ahmed Khan', phone: '03001234567', relationship: 'Friend' },
  });
  const person2 = await prisma.person.create({
    data: { userId: user.id, name: 'Bilal Shah', phone: '03119876543', relationship: 'Colleague' },
  });
  const person3 = await prisma.person.create({
    data: { userId: user.id, name: 'Usman Ali', phone: '03211112222', relationship: 'Relative' },
  });
  console.log('✅ Persons created');

  // Create loans (direction not loanType, transactionDate not date, needs remainingAmount)
  await prisma.$transaction(async (tx: any) => {
    // Loan given (receivable)
    await tx.loan.create({
      data: {
        userId: user.id, personId: person1.id, accountId: bankAccount.id,
        direction: 'GIVEN', amount: 50000, remainingAmount: 50000,
        notes: 'Lent for car repair',
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      },
    });
    // Loan taken (payable)
    await tx.loan.create({
      data: {
        userId: user.id, personId: person2.id, accountId: cashAccount.id,
        direction: 'TAKEN', amount: 30000, remainingAmount: 20000,
        notes: 'Borrowed for emergency',
        transactionDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      },
    });
  });
  console.log('✅ Loans created');

  // Create savings goals (no currentAmount or description — those don't exist on the model)
  await prisma.savingsGoal.create({
    data: {
      userId: user.id, name: 'Emergency Fund', targetAmount: 500000,
      notes: 'Build 6-month emergency fund',
      targetDate: new Date(now.getFullYear() + 1, 5, 30),
    },
  });
  await prisma.savingsGoal.create({
    data: {
      userId: user.id, name: 'Hajj Fund', targetAmount: 1500000,
      notes: 'Saving for Hajj',
    },
  });
  console.log('✅ Savings goals created');

  // Create investments (amountInvested not investedAmount, investmentDate not date, needs accountId)
  await prisma.investment.create({
    data: {
      userId: user.id, name: 'PSX - OGDC Shares', investmentType: 'Stock',
      amountInvested: 100000, currentValue: 115000, accountId: bankAccount.id,
      investmentDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
      notes: '500 shares @ Rs. 200',
    },
  });
  await prisma.investment.create({
    data: {
      userId: user.id, name: 'Gold - 1 Tola', investmentType: 'Gold',
      amountInvested: 220000, currentValue: 235000, accountId: cashAccount.id,
      investmentDate: new Date(now.getFullYear(), now.getMonth() - 6, 1),
    },
  });
  console.log('✅ Investments created');

  // Create a plot (no paidAmount, purchaseDate, or description on the model)
  await prisma.plot.create({
    data: {
      userId: user.id, name: 'DHA Phase 8 - Plot 123',
      location: 'DHA Phase 8, Karachi', totalPrice: 5000000,
      notes: '5 Marla residential plot, purchased Jan 2025',
    },
  });
  console.log('✅ Plot created');

  // Create a committee (memberCount not totalMembers, monthlyContribution not monthlyAmount)
  const committee = await prisma.committee.create({
    data: {
      userId: user.id, name: 'Office Committee 2024', type: 'NORMAL',
      memberCount: 10, monthlyContribution: 10000, totalAmount: 100000,
      startDate: new Date(now.getFullYear(), 0, 1),
    },
  });
  // Add members (CommitteeMember has name, personId, slots)
  for (const person of [person1, person2, person3]) {
    await prisma.committeeMember.create({
      data: {
        committeeId: committee.id, personId: person.id,
        name: person.name, slots: 1,
        isUser: false,
      },
    });
  }
  // Add user's own entry slot
  await prisma.committeeMember.create({
    data: {
      committeeId: committee.id, name: user.name,
      slots: 1, isUser: true,
    },
  });
  // Add entry slots for the user
  await prisma.committeeEntry.create({
    data: { committeeId: committee.id, userId: user.id, slotNumber: 1 },
  });
  console.log('✅ Committee created with members');

  // Create financial targets (type not targetType, month/year not period)
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  await prisma.financialTarget.create({
    data: {
      userId: user.id, name: 'Monthly Grocery Budget', type: 'MAX_EXPENSE',
      amount: 40000, month: currentMonth, year: currentYear,
      categoryId: groceriesCategory!.id,
    },
  });
  await prisma.financialTarget.create({
    data: {
      userId: user.id, name: 'Monthly Expense Cap', type: 'MAX_TOTAL_EXPENSE',
      amount: 100000, month: currentMonth, year: currentYear,
    },
  });
  await prisma.financialTarget.create({
    data: {
      userId: user.id, name: 'Minimum Monthly Income', type: 'MIN_INCOME',
      amount: 150000, month: currentMonth, year: currentYear,
    },
  });
  console.log('✅ Financial targets created');

  console.log('\n🎉 Seed completed!');
  console.log('📧 Login: demo@budgettracker.com / demo1234');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
