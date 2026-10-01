import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding extra seed data...');

  const user = await prisma.user.findUnique({ where: { email: 'demo@finkeep.com' } });
  if (!user) { console.error('Demo user not found. Run main seed first.'); process.exit(1); }

  // ─── MORE ACCOUNTS ─────────────────────────────────────────────
  const now = new Date();

  const meezanAccount = await prisma.account.upsert({
    where: { id: 'seed-meezan' },
    update: {},
    create: { id: 'seed-meezan', userId: user.id, name: 'Meezan Bank', accountType: 'BANK', openingBalance: 350000, openingDate: new Date(2025, 0, 1), currency: 'PKR', notes: 'Primary salary account' },
  });
  const epAccount = await prisma.account.upsert({
    where: { id: 'seed-ep' },
    update: {},
    create: { id: 'seed-ep', userId: user.id, name: 'EasyPaisa', accountType: 'WALLET', openingBalance: 12000, openingDate: new Date(2025, 2, 1), currency: 'PKR' },
  });
  const sadaPayAccount = await prisma.account.upsert({
    where: { id: 'seed-sadapay' },
    update: {},
    create: { id: 'seed-sadapay', userId: user.id, name: 'SadaPay', accountType: 'WALLET', openingBalance: 25000, openingDate: new Date(2025, 5, 1), currency: 'PKR' },
  });
  console.log('✅ Extra accounts created');

  // Fetch existing accounts
  const bankAccount = await prisma.account.findFirst({ where: { userId: user.id, name: 'HBL Savings' } });
  const cashAccount = await prisma.account.findFirst({ where: { userId: user.id, name: 'Cash Wallet' } });
  if (!bankAccount || !cashAccount) { console.error('Missing base accounts. Run main seed first.'); process.exit(1); }

  // Fetch categories
  const cats = await prisma.category.findMany({ where: { userId: user.id } });
  const cat = (name: string) => cats.find(c => c.name === name)!;

  // ─── HISTORICAL TRANSACTIONS (last 6 months) ──────────────────
  const txData: Array<{ sourceAccountId: string; type: 'INCOME' | 'EXPENSE' | 'TRANSFER'; amount: number; description: string; categoryId?: string; destAccountId?: string; transactionDate: Date }> = [];

  for (let m = 5; m >= 0; m--) {
    const year = now.getFullYear();
    const month = now.getMonth() - m;
    const d = (day: number) => new Date(year, month, day);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mName = monthNames[(12 + month) % 12];

    // Monthly salary
    txData.push({ sourceAccountId: meezanAccount.id, type: 'INCOME', amount: 150000 + m * 5000, description: `Salary - ${mName}`, categoryId: cat('Salary').id, transactionDate: d(1) });

    // Freelance (some months)
    if (m % 2 === 0) {
      txData.push({ sourceAccountId: bankAccount.id, type: 'INCOME', amount: 25000 + m * 3000, description: `Freelance project - ${mName}`, categoryId: cat('Freelance').id, transactionDate: d(10) });
    }

    // Groceries (weekly)
    txData.push({ sourceAccountId: cashAccount.id, type: 'EXPENSE', amount: 7500, description: `Groceries week 1 - ${mName}`, categoryId: cat('Groceries').id, transactionDate: d(3) });
    txData.push({ sourceAccountId: cashAccount.id, type: 'EXPENSE', amount: 8200, description: `Groceries week 2 - ${mName}`, categoryId: cat('Groceries').id, transactionDate: d(10) });
    txData.push({ sourceAccountId: cashAccount.id, type: 'EXPENSE', amount: 6800, description: `Groceries week 3 - ${mName}`, categoryId: cat('Groceries').id, transactionDate: d(17) });
    txData.push({ sourceAccountId: cashAccount.id, type: 'EXPENSE', amount: 9100, description: `Groceries week 4 - ${mName}`, categoryId: cat('Groceries').id, transactionDate: d(24) });

    // Utilities
    txData.push({ sourceAccountId: meezanAccount.id, type: 'EXPENSE', amount: 8500 + Math.floor(m * 1500), description: `Electricity bill - ${mName}`, categoryId: cat('Utilities').id, transactionDate: d(5) });
    txData.push({ sourceAccountId: meezanAccount.id, type: 'EXPENSE', amount: 3200, description: `Gas bill - ${mName}`, categoryId: cat('Utilities').id, transactionDate: d(8) });

    // Fuel
    txData.push({ sourceAccountId: cashAccount.id, type: 'EXPENSE', amount: 5000, description: `Petrol fill-up - ${mName}`, categoryId: cat('Fuel').id, transactionDate: d(6) });
    txData.push({ sourceAccountId: cashAccount.id, type: 'EXPENSE', amount: 4500, description: `Petrol top-up - ${mName}`, categoryId: cat('Fuel').id, transactionDate: d(20) });

    // Food & Dining
    txData.push({ sourceAccountId: cashAccount.id, type: 'EXPENSE', amount: 2800, description: `Restaurant - ${mName}`, categoryId: cat('Food & Dining').id, transactionDate: d(12) });
    txData.push({ sourceAccountId: epAccount.id, type: 'EXPENSE', amount: 1500, description: `FoodPanda order - ${mName}`, categoryId: cat('Food & Dining').id, transactionDate: d(18) });

    // Mobile & Internet
    txData.push({ sourceAccountId: epAccount.id, type: 'EXPENSE', amount: 2500, description: `Internet bill - ${mName}`, categoryId: cat('Mobile & Internet').id, transactionDate: d(7) });
    txData.push({ sourceAccountId: epAccount.id, type: 'EXPENSE', amount: 1200, description: `Mobile recharge - ${mName}`, categoryId: cat('Mobile & Internet').id, transactionDate: d(15) });

    // Rent
    txData.push({ sourceAccountId: meezanAccount.id, type: 'EXPENSE', amount: 35000, description: `Monthly rent - ${mName}`, categoryId: cat('Rent').id, transactionDate: d(1) });

    // Shopping (some months)
    if (m % 3 === 0) {
      txData.push({ sourceAccountId: sadaPayAccount.id, type: 'EXPENSE', amount: 12000, description: `Daraz shopping - ${mName}`, categoryId: cat('Shopping').id, transactionDate: d(14) });
    }

    // Transfer: Bank -> Cash (monthly cash withdrawal)
    txData.push({ sourceAccountId: meezanAccount.id, type: 'TRANSFER', amount: 30000, description: `ATM withdrawal - ${mName}`, destAccountId: cashAccount.id, transactionDate: d(2) });
  }

  for (const tx of txData) {
    await prisma.transaction.create({
      data: { userId: user.id, ...tx },
    });
  }
  console.log(`✅ ${txData.length} historical transactions created`);

  // ─── PLOT INSTALLMENTS ─────────────────────────────────────────
  const plot = await prisma.plot.findFirst({ where: { userId: user.id } });
  if (plot) {
    // 12 monthly installments of varying amounts (down payment + 11 monthly)
    const installments = [
      { amount: 500000, date: new Date(2025, 0, 15), notes: 'Down payment (10%)' },
      { amount: 200000, date: new Date(2025, 1, 1), notes: 'Installment 1' },
      { amount: 200000, date: new Date(2025, 2, 1), notes: 'Installment 2' },
      { amount: 200000, date: new Date(2025, 3, 1), notes: 'Installment 3' },
      { amount: 200000, date: new Date(2025, 4, 1), notes: 'Installment 4' },
      { amount: 200000, date: new Date(2025, 5, 1), notes: 'Installment 5' },
      { amount: 200000, date: new Date(2025, 6, 1), notes: 'Installment 6' },
      { amount: 200000, date: new Date(2025, 7, 1), notes: 'Installment 7' },
      { amount: 200000, date: new Date(2025, 8, 1), notes: 'Installment 8' },
      { amount: 200000, date: new Date(2025, 9, 1), notes: 'Installment 9' },
      { amount: 200000, date: new Date(2025, 10, 1), notes: 'Installment 10' },
      { amount: 200000, date: new Date(2025, 11, 1), notes: 'Installment 11' },
      { amount: 200000, date: new Date(2026, 0, 1), notes: 'Installment 12' },
      { amount: 200000, date: new Date(2026, 1, 1), notes: 'Installment 13' },
      { amount: 200000, date: new Date(2026, 2, 1), notes: 'Installment 14' },
      { amount: 200000, date: new Date(2026, 3, 1), notes: 'Installment 15' },
      { amount: 200000, date: new Date(2026, 4, 1), notes: 'Installment 16' },
      { amount: 200000, date: new Date(2026, 5, 1), notes: 'Installment 17' },
      { amount: 200000, date: new Date(2026, 6, 1), notes: 'Installment 18' },
      { amount: 200000, date: new Date(2026, 7, 1), notes: 'Installment 19' },
      { amount: 200000, date: new Date(2026, 8, 1), notes: 'Installment 20' },
      { amount: 200000, date: new Date(2026, 9, 1), notes: 'Installment 21 (latest)' },
    ];

    for (const inst of installments) {
      await prisma.plotPayment.create({
        data: {
          plotId: plot.id,
          accountId: meezanAccount.id,
          amount: inst.amount,
          transactionDate: inst.date,
          dueDate: inst.date,
          notes: inst.notes,
        },
      });
    }
    console.log(`✅ ${installments.length} plot installments created (Rs. ${installments.reduce((s, i) => s + i.amount, 0).toLocaleString()} total paid)`);
  }

  // ─── SECOND PLOT (completed) ───────────────────────────────────
  const plot2 = await prisma.plot.create({
    data: {
      userId: user.id,
      name: 'Bahria Town Ph. 7 - Plot 45',
      totalPrice: 3000000,
      location: 'Bahria Town Phase 7, Rawalpindi',
      notes: '3 Marla commercial plot, fully paid',
    },
  });
  const plot2Installments = [
    { amount: 600000, date: new Date(2024, 6, 1), notes: 'Down payment (20%)' },
    { amount: 300000, date: new Date(2024, 7, 1), notes: 'Installment 1' },
    { amount: 300000, date: new Date(2024, 8, 1), notes: 'Installment 2' },
    { amount: 300000, date: new Date(2024, 9, 1), notes: 'Installment 3' },
    { amount: 300000, date: new Date(2024, 10, 1), notes: 'Installment 4' },
    { amount: 300000, date: new Date(2024, 11, 1), notes: 'Installment 5' },
    { amount: 300000, date: new Date(2025, 0, 1), notes: 'Installment 6' },
    { amount: 300000, date: new Date(2025, 1, 1), notes: 'Installment 7' },
    { amount: 300000, date: new Date(2025, 2, 1), notes: 'Final payment' },
  ];
  for (const inst of plot2Installments) {
    await prisma.plotPayment.create({
      data: { plotId: plot2.id, accountId: bankAccount.id, amount: inst.amount, transactionDate: inst.date, dueDate: inst.date, notes: inst.notes },
    });
  }
  console.log('✅ Second plot with 9 installments created (fully paid)');

  // ─── COMMITTEE ROUNDS & CONTRIBUTIONS ──────────────────────────
  const committee = await prisma.committee.findFirst({ where: { userId: user.id }, include: { entries: true } });
  if (committee) {
    const userEntry = committee.entries.find(e => e.userId === user.id);
    if (userEntry) {
      // Create 8 past rounds (committee started Jan 2026)
      for (let r = 1; r <= 8; r++) {
        const roundDate = new Date(2026, r - 1, 5);
        const round = await prisma.committeeRound.upsert({
          where: { committeeId_roundNumber: { committeeId: committee.id, roundNumber: r } },
          update: {},
          create: {
            committeeId: committee.id,
            roundNumber: r,
            roundDate,
            totalAmount: 100000,
            expectedAmount: 100000,
            winningMember: r === 3 ? 'Demo User' : ['Ahmed Khan', 'Bilal Shah', 'Usman Ali', 'Member 5', 'Member 6', 'Member 7', 'Member 8'][r > 3 ? r - 2 : r - 1],
            payoutAmount: 100000,
            memberCount: 10,
            notes: r === 3 ? 'User received payout this round' : undefined,
          },
        });

        // User's contribution for each round
        await prisma.committeeContribution.create({
          data: {
            committeeId: committee.id,
            entryId: userEntry.id,
            roundId: round.id,
            accountId: meezanAccount.id,
            expectedAmount: 10000,
            actualAmount: 10000,
            status: 'PAID',
            transactionDate: roundDate,
            notes: `Round ${r} contribution`,
          },
        });

        // User received payout in round 3
        if (r === 3) {
          await prisma.committeeReceiving.create({
            data: {
              committeeId: committee.id,
              entryId: userEntry.id,
              roundId: round.id,
              accountId: meezanAccount.id,
              expectedAmount: 100000,
              actualAmount: 100000,
              transactionDate: roundDate,
              notes: 'Committee payout received',
            },
          });
          // Mark entry as taken
          await prisma.committeeEntry.update({
            where: { id: userEntry.id },
            data: { isTaken: true, takenInRound: 3 },
          });
        }
      }
      console.log('✅ 8 committee rounds with contributions created (payout in round 3)');
    }
  }

  // ─── SECOND COMMITTEE (completed) ──────────────────────────────
  const persons = await prisma.person.findMany({ where: { userId: user.id } });
  const committee2 = await prisma.committee.create({
    data: {
      userId: user.id,
      name: 'Family Committee 2025',
      type: 'NORMAL',
      status: 'COMPLETED',
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2025, 11, 31),
      memberCount: 5,
      monthlyContribution: 20000,
      totalAmount: 100000,
      notes: 'Completed family committee — 12 months',
    },
  });
  // Members
  for (const p of persons) {
    await prisma.committeeMember.create({
      data: { committeeId: committee2.id, personId: p.id, name: p.name, slots: 1, isUser: false },
    });
  }
  await prisma.committeeMember.create({
    data: { committeeId: committee2.id, name: user.name, slots: 2, isUser: true },
  });
  // User entries (2 slots)
  const entry2a = await prisma.committeeEntry.create({
    data: { committeeId: committee2.id, userId: user.id, slotNumber: 1, isTaken: true, takenInRound: 2 },
  });
  const entry2b = await prisma.committeeEntry.create({
    data: { committeeId: committee2.id, userId: user.id, slotNumber: 2, isTaken: true, takenInRound: 8 },
  });
  // 12 rounds
  for (let r = 1; r <= 12; r++) {
    const roundDate = new Date(2025, r - 1, 5);
    const round = await prisma.committeeRound.create({
      data: {
        committeeId: committee2.id, roundNumber: r, roundDate,
        totalAmount: 100000, expectedAmount: 100000, payoutAmount: 100000, memberCount: 5,
        winningMember: r === 2 ? 'Demo User (Slot 1)' : r === 8 ? 'Demo User (Slot 2)' : persons[r % persons.length]?.name || 'Other member',
      },
    });
    // Contributions for both slots
    for (const entry of [entry2a, entry2b]) {
      await prisma.committeeContribution.create({
        data: {
          committeeId: committee2.id, entryId: entry.id, roundId: round.id,
          accountId: bankAccount.id, expectedAmount: 20000, actualAmount: 20000,
          status: 'PAID', transactionDate: roundDate,
        },
      });
    }
    // Receivings
    if (r === 2) {
      await prisma.committeeReceiving.create({
        data: { committeeId: committee2.id, entryId: entry2a.id, roundId: round.id, accountId: bankAccount.id, expectedAmount: 100000, actualAmount: 100000, transactionDate: roundDate, notes: 'Slot 1 payout' },
      });
    }
    if (r === 8) {
      await prisma.committeeReceiving.create({
        data: { committeeId: committee2.id, entryId: entry2b.id, roundId: round.id, accountId: bankAccount.id, expectedAmount: 100000, actualAmount: 100000, transactionDate: roundDate, notes: 'Slot 2 payout' },
      });
    }
  }
  console.log('✅ Completed committee (12 rounds, 2 slots) created');

  // ─── MORE LOAN REPAYMENTS ──────────────────────────────────────
  const loans = await prisma.loan.findMany({ where: { userId: user.id } });
  const takenLoan = loans.find(l => l.direction === 'TAKEN');
  if (takenLoan) {
    await prisma.loanRepayment.create({
      data: { loanId: takenLoan.id, userId: user.id, accountId: cashAccount.id, personId: takenLoan.personId, amount: 5000, transactionDate: new Date(2026, 6, 15), notes: 'Partial repayment 1' },
    });
    await prisma.loanRepayment.create({
      data: { loanId: takenLoan.id, userId: user.id, accountId: cashAccount.id, personId: takenLoan.personId, amount: 5000, transactionDate: new Date(2026, 7, 15), notes: 'Partial repayment 2' },
    });
    console.log('✅ Loan repayments added');
  }

  // ─── SAVINGS GOAL TRANSACTIONS ─────────────────────────────────
  const savingsGoal = await prisma.savingsGoal.findFirst({ where: { userId: user.id, name: 'Emergency Fund' } });
  if (savingsGoal) {
    for (let m = 0; m < 8; m++) {
      await prisma.savingsTransaction.create({
        data: {
          savingsGoalId: savingsGoal.id,
          accountId: meezanAccount.id,
          type: 'DEPOSIT',
          amount: 25000 + (m % 3) * 5000,
          transactionDate: new Date(2026, m, 10),
          notes: `Monthly savings deposit`,
        },
      });
    }
    console.log('✅ 8 savings deposits added to Emergency Fund');
  }

  console.log('\n🎉 Extra seed data completed!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
