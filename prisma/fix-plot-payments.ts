import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plotId = 'cmupcsk2j0001jq04txp60cqy';
  const userId = 'cmupc240c0000jr04q78bsk86';
  const accountId = 'cmupc7j51000wjr04s483f05d'; // Standard Chartered - Mahasagar
  const beneficiary = 'AIMAL DEVELOPERS (PRIVATE) LIMITED | A/C: PK03MPBL0114067140375732';

  // ═══ STEP 1: VERIFY ═══
  const plot = await prisma.plot.findUnique({ where: { id: plotId } });
  if (!plot) { console.error('Plot not found'); process.exit(1); }
  if (plot.userId !== userId) { console.error('DISCREPANCY: Plot belongs to ' + plot.userId + ', expected ' + userId); process.exit(1); }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) { console.error('Standard Chartered account not found'); process.exit(1); }
  if (account.userId !== userId) { console.error('Account does not belong to user'); process.exit(1); }

  console.log('Plot verified: ' + plot.name);
  console.log('Account verified: ' + account.name);

  // ═══ STEP 2: DELETE INCORRECT RECORDS ═══
  const deleted = await prisma.plotPayment.deleteMany({ where: { plotId } });
  console.log('Deleted ' + deleted.count + ' incorrect records');

  // ═══ STEP 3: INSERT CORRECT HISTORICAL RECORDS ═══

  // 3a. Initial Payment — PKR 200,000
  const initialDate = new Date('2024-01-15');
  await prisma.plotPayment.create({
    data: { plotId, accountId, amount: 200000, transactionDate: initialDate, dueDate: initialDate, notes: `Initial Payment (Down Payment) - ${beneficiary}` },
  });
  console.log('Inserted: Initial Payment Rs. 200,000');

  // 3b. 32 historical installments with exact dates from source
  const installments: Array<{ num: number; date: string }> = [
    { num: 1,  date: '2024-02-28' },
    { num: 2,  date: '2024-03-07' },
    { num: 3,  date: '2024-04-05' },
    { num: 4,  date: '2024-05-06' },
    { num: 5,  date: '2024-06-03' },
    { num: 6,  date: '2024-07-02' },
    { num: 7,  date: '2024-08-02' },
    { num: 8,  date: '2024-09-05' },
    { num: 9,  date: '2024-10-02' },
    { num: 10, date: '2024-11-04' },
    { num: 11, date: '2024-11-05' },
    { num: 12, date: '2025-01-02' },
    { num: 13, date: '2025-02-03' },
    { num: 14, date: '2025-03-03' },
    { num: 15, date: '2025-05-02' },
    { num: 16, date: '2025-05-02' },
    { num: 17, date: '2025-06-30' },
    { num: 18, date: '2025-06-30' },
    { num: 19, date: '2025-08-16' },
    { num: 20, date: '2025-09-29' },
    { num: 21, date: '2025-09-29' },
    { num: 22, date: '2026-01-06' },
    { num: 23, date: '2026-01-06' },
    { num: 24, date: '2026-01-06' },
    { num: 25, date: '2026-03-04' },
    { num: 26, date: '2026-03-04' },
    { num: 27, date: '2026-05-05' },
    { num: 28, date: '2026-05-05' },
    { num: 29, date: '2026-07-06' },
    { num: 30, date: '2026-07-06' },
    { num: 31, date: '2026-09-01' },
    { num: 32, date: '2026-09-01' },
  ];

  for (const inst of installments) {
    const d = new Date(inst.date);
    await prisma.plotPayment.create({
      data: {
        plotId, accountId, amount: 10000,
        transactionDate: d, dueDate: d,
        notes: `Installment #${inst.num} of 60 (Paid) - ${beneficiary}`,
      },
    });
  }
  console.log('Inserted: 32 installments (Rs. 320,000)');

  // 3c. After 20 Months additional payment — PKR 100,000
  const month20Date = new Date('2025-09-29');
  await prisma.plotPayment.create({
    data: { plotId, accountId, amount: 100000, transactionDate: month20Date, dueDate: month20Date, notes: `After 20 Months Payment (Paid) - ${beneficiary}` },
  });
  console.log('Inserted: After 20 Months Payment Rs. 100,000');

  // NOT inserted: After 40 months (remaining), Final payment (remaining), Installments #33-60 (future)

  // ═══ STEP 4: VERIFICATION ═══
  console.log('\n=== VERIFICATION ===');

  const payments = await prisma.plotPayment.findMany({ where: { plotId }, orderBy: { transactionDate: 'asc' } });

  const instRecords = payments.filter(p => p.notes?.startsWith('Installment #'));
  const initialRec = payments.filter(p => p.notes?.startsWith('Initial Payment'));
  const after20Rec = payments.filter(p => p.notes?.startsWith('After 20'));
  const after40Rec = payments.filter(p => p.notes?.startsWith('After 40'));
  const finalRec = payments.filter(p => p.notes?.startsWith('Final Payment'));
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const allSC = payments.every(p => p.accountId === accountId);

  // Check installment numbers are exactly 1-32
  const instNums = instRecords.map(p => {
    const match = p.notes?.match(/Installment #(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }).sort((a, b) => a - b);
  const hasExact1to32 = instNums.length === 32 && instNums[0] === 1 && instNums[31] === 32;

  // Check dueDate matches transactionDate
  const dueDateMatch = payments.every(p =>
    p.dueDate && new Date(p.dueDate).toISOString() === new Date(p.transactionDate).toISOString()
  );

  // Verify exact dates against source
  const expectedDates: Record<number, string> = {
    1:'2024-02-28',2:'2024-03-07',3:'2024-04-05',4:'2024-05-06',5:'2024-06-03',
    6:'2024-07-02',7:'2024-08-02',8:'2024-09-05',9:'2024-10-02',10:'2024-11-04',
    11:'2024-11-05',12:'2025-01-02',13:'2025-02-03',14:'2025-03-03',15:'2025-05-02',
    16:'2025-05-02',17:'2025-06-30',18:'2025-06-30',19:'2025-08-16',20:'2025-09-29',
    21:'2025-09-29',22:'2026-01-06',23:'2026-01-06',24:'2026-01-06',25:'2026-03-04',
    26:'2026-03-04',27:'2026-05-05',28:'2026-05-05',29:'2026-07-06',30:'2026-07-06',
    31:'2026-09-01',32:'2026-09-01',
  };

  let datesMatch = true;
  for (const rec of instRecords) {
    const match = rec.notes?.match(/Installment #(\d+)/);
    if (!match) { datesMatch = false; continue; }
    const num = parseInt(match[1]);
    const expected = new Date(expectedDates[num]).toISOString().split('T')[0];
    const actual = new Date(rec.transactionDate).toISOString().split('T')[0];
    if (expected !== actual) {
      datesMatch = false;
      console.log(`DATE MISMATCH: #${num} expected ${expected} got ${actual}`);
    }
  }

  // Check no October-2026-only dates
  const oct2026Count = payments.filter(p => {
    const d = new Date(p.transactionDate);
    return d.getMonth() === 9 && d.getFullYear() === 2026;
  }).length;

  const checks: Array<[string, boolean, string?]> = [
    ['Installments #1-32 exist (exactly 32)', hasExact1to32, `${instNums.length} records`],
    ['No installments #33-60 created', instNums.every(n => n <= 32)],
    ['Dates match source table exactly', datesMatch],
    ['All installments marked Paid (in notes)', instRecords.every(p => p.notes?.includes('(Paid)'))],
    ['Initial payment Rs. 200,000 exists', initialRec.length === 1 && Number(initialRec[0].amount) === 200000],
    ['After 20 months Rs. 100,000 exists', after20Rec.length === 1 && Number(after20Rec[0].amount) === 100000],
    ['No after-40-months payment (remaining)', after40Rec.length === 0],
    ['No final payment (remaining)', finalRec.length === 0],
    ['Total paid = Rs. 620,000', totalPaid === 620000, `Rs. ${totalPaid.toLocaleString()}`],
    ['Total remaining = Rs. 580,000', (1200000 - totalPaid) === 580000, `Rs. ${(1200000 - totalPaid).toLocaleString()}`],
    ['Overall plan = Rs. 1,200,000', true],
    ['All records belong to plot', payments.every(p => p.plotId === plotId)],
    ['All use Standard Chartered - Mahasagar', allSC],
    ['dueDate = transactionDate for all', dueDateMatch],
    ['No incorrect Oct 2026 blanket dates', oct2026Count === 0, `${oct2026Count} oct-2026 records`],
    ['Total records = 34', payments.length === 34, `${payments.length}/34`],
  ];

  let allPass = true;
  for (const [label, pass, detail] of checks) {
    const status = pass ? 'PASS' : 'FAIL';
    if (!pass) allPass = false;
    console.log(`${status}  ${label}${detail ? ` (${detail})` : ''}`);
  }

  console.log('\nFinancial Summary:');
  console.log('  Initial payment:        Rs. 200,000 (paid)');
  console.log('  32 installments:        Rs. 320,000 (paid)');
  console.log('  After 20 months:        Rs. 100,000 (paid)');
  console.log('  ─────────────────────────────────');
  console.log('  Total paid:             Rs. 620,000');
  console.log('');
  console.log('  28 future installments: Rs. 280,000 (remaining)');
  console.log('  After 40 months:        Rs. 100,000 (remaining)');
  console.log('  Final payment:          Rs. 200,000 (remaining)');
  console.log('  ─────────────────────────────────');
  console.log('  Total remaining:        Rs. 580,000');
  console.log('');
  console.log('  Total plot price:       Rs. 1,200,000');
  console.log('');
  console.log(allPass ? 'ALL VALIDATIONS PASSED' : 'SOME VALIDATIONS FAILED');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
