import { PrismaClient } from '@prisma/client';
import { SYSTEM_INCOME_CATEGORIES, SYSTEM_EXPENSE_CATEGORIES } from './system-categories';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Migrating to system categories...\n');

  // 1. Ensure system categories exist
  const allSystemCats = [
    ...SYSTEM_INCOME_CATEGORIES.map(c => ({ ...c, group: 'INCOME' as const })),
    ...SYSTEM_EXPENSE_CATEGORIES.map(c => ({ ...c, group: 'EXPENSE' as const })),
  ];

  for (const cat of allSystemCats) {
    const existing = await prisma.category.findFirst({
      where: { isSystem: true, name: cat.name, group: cat.group },
    });
    if (!existing) {
      await prisma.category.create({
        data: { name: cat.name, group: cat.group, icon: cat.icon, isSystem: true },
      });
    }
  }
  console.log('✅ System categories ensured\n');

  // 2. For each system category, find user-owned duplicates and reassign their transactions
  const systemCats = await prisma.category.findMany({ where: { isSystem: true } });

  let reassigned = 0;
  let removed = 0;

  for (const sysCat of systemCats) {
    // Find user-owned categories with matching name + group (case-insensitive)
    const userDupes = await prisma.category.findMany({
      where: {
        isSystem: false,
        name: { equals: sysCat.name, mode: 'insensitive' },
        group: sysCat.group,
      },
    });

    for (const dupe of userDupes) {
      // Reassign transactions from user dupe to system category
      const result = await prisma.transaction.updateMany({
        where: { categoryId: dupe.id },
        data: { categoryId: sysCat.id },
      });
      if (result.count > 0) {
        console.log(`  📦 Reassigned ${result.count} transaction(s) from "${dupe.name}" (user: ${dupe.userId}) → system`);
        reassigned += result.count;
      }

      // Reassign financial targets
      const targetResult = await prisma.financialTarget.updateMany({
        where: { categoryId: dupe.id },
        data: { categoryId: sysCat.id },
      });
      if (targetResult.count > 0) {
        console.log(`  🎯 Reassigned ${targetResult.count} target(s) from "${dupe.name}" (user: ${dupe.userId}) → system`);
      }

      // Delete the user duplicate
      await prisma.category.delete({ where: { id: dupe.id } });
      removed++;
    }
  }

  // 3. Also handle old names that were renamed (e.g. "Business Income" → "Business")
  const renames: Array<{ oldName: string; newName: string; group: 'INCOME' | 'EXPENSE' }> = [
    { oldName: 'Business Income', newName: 'Business', group: 'INCOME' },
    { oldName: 'Gift', newName: 'Gifts', group: 'INCOME' },
    { oldName: 'Refund', newName: 'Refunds', group: 'INCOME' },
  ];

  for (const { oldName, newName, group } of renames) {
    const sysCat = systemCats.find(c => c.name === newName && c.group === group);
    if (!sysCat) continue;

    const oldCats = await prisma.category.findMany({
      where: { name: { equals: oldName, mode: 'insensitive' }, group, isSystem: false },
    });

    for (const old of oldCats) {
      const txResult = await prisma.transaction.updateMany({
        where: { categoryId: old.id },
        data: { categoryId: sysCat.id },
      });
      if (txResult.count > 0) {
        console.log(`  📦 Reassigned ${txResult.count} transaction(s) from "${oldName}" → "${newName}" (system)`);
        reassigned += txResult.count;
      }
      const targetResult = await prisma.financialTarget.updateMany({
        where: { categoryId: old.id },
        data: { categoryId: sysCat.id },
      });
      if (targetResult.count > 0) {
        console.log(`  🎯 Reassigned ${targetResult.count} target(s) from "${oldName}" → "${newName}" (system)`);
      }
      await prisma.category.delete({ where: { id: old.id } });
      removed++;
    }

    // Also clean up system-level old names
    const oldSystemCats = await prisma.category.findMany({
      where: { name: { equals: oldName, mode: 'insensitive' }, group, isSystem: true },
    });
    for (const old of oldSystemCats) {
      const txResult = await prisma.transaction.updateMany({
        where: { categoryId: old.id },
        data: { categoryId: sysCat.id },
      });
      if (txResult.count > 0) reassigned += txResult.count;
      await prisma.category.delete({ where: { id: old.id } });
      removed++;
    }
  }

  console.log(`\n🎉 Migration complete!`);
  console.log(`   ${reassigned} transaction(s) reassigned`);
  console.log(`   ${removed} duplicate category(ies) removed`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
