import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

Decimal.set({ precision: 20 });

const prisma = new PrismaClient();

async function main() {
  const waiykCommittees = await prisma.committee.findMany({
    where: { type: 'WAIYK' },
    include: {
      entries: true,
      rounds: { orderBy: { roundNumber: 'asc' } },
    },
  });

  console.log(`Found ${waiykCommittees.length} Waiyk committee(s)\n`);

  for (const committee of waiykCommittees) {
    const totalSlots = committee.entries.length || committee.memberCount;
    const committeeValue = committee.totalAmount
      ? new Decimal(committee.totalAmount.toString())
      : new Decimal(committee.monthlyContribution.toString()).times(committee.memberCount);

    console.log(`Committee: ${committee.name}`);
    console.log(`  Total slots: ${totalSlots}, Committee value: ${committeeValue}\n`);

    for (const round of committee.rounds) {
      if (!round.winningBid) {
        console.log(`  Round ${round.roundNumber}: no winning bid, skipping`);
        continue;
      }

      const bid = new Decimal(round.winningBid.toString());
      const profitTotal = committeeValue.minus(bid);
      const profitPerSlot = profitTotal.dividedBy(totalSlots);

      const oldProfitAmt = round.profitAmount ? round.profitAmount.toString() : 'null';
      const oldProfitPM = round.profitPerMember ? round.profitPerMember.toString() : 'null';

      console.log(`  Round ${round.roundNumber}: bid=${bid}`);
      console.log(`    OLD: profitAmount=${oldProfitAmt}, profitPerMember=${oldProfitPM}`);
      console.log(`    NEW: profitAmount=${profitTotal.toFixed(2)}, profitPerSlot=${profitPerSlot.toFixed(2)}`);

      await prisma.committeeRound.update({
        where: { id: round.id },
        data: {
          totalAmount: committeeValue,
          profitAmount: new Decimal(profitTotal.toFixed(2)),
          profitPerMember: new Decimal(profitPerSlot.toFixed(2)),
          payoutAmount: bid,
        },
      });

      console.log(`    UPDATED`);
    }
    console.log('');
  }

  console.log('Done — all Waiyk rounds recalculated.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
