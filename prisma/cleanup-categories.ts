import { PrismaClient } from '@prisma/client';
import { SYSTEM_INCOME_CATEGORIES, SYSTEM_EXPENSE_CATEGORIES } from './system-categories';

const prisma = new PrismaClient();

const SYSTEM_CATS = [
  ...SYSTEM_INCOME_CATEGORIES.map(c => ({ ...c, group: 'INCOME' as const })),
  ...SYSTEM_EXPENSE_CATEGORIES.map(c => ({ ...c, group: 'EXPENSE' as const })),
];

// Map of near-duplicate / old names → canonical system name
const MERGE_MAP: Record<string, { name: string; group: 'INCOME' | 'EXPENSE' }> = {
  'food|EXPENSE': { name: 'Food & Dining', group: 'EXPENSE' },
  'medical|EXPENSE': { name: 'Healthcare', group: 'EXPENSE' },
  'bills|EXPENSE': { name: 'Utilities', group: 'EXPENSE' },
  'business income|INCOME': { name: 'Business', group: 'INCOME' },
  'gift|INCOME': { name: 'Gifts', group: 'INCOME' },
  'refund|INCOME': { name: 'Refunds', group: 'INCOME' },
};

async function reassignAndDelete(fromId: string, toId: string, label: string) {
  const txResult = await prisma.transaction.updateMany({
    where: { categoryId: fromId },
    data: { categoryId: toId },
  });
  if (txResult.count > 0) console.log(`  📦 ${txResult.count} transaction(s) reassigned — ${label}`);

  const targetResult = await prisma.financialTarget.updateMany({
    where: { categoryId: fromId },
    data: { categoryId: toId },
  });
  if (targetResult.count > 0) console.log(`  🎯 ${targetResult.count} target(s) reassigned — ${label}`);

  await prisma.category.delete({ where: { id: fromId } });
}

async function main() {
  console.log('🧹 Cleaning up categories...\n');

  // Step 1: Ensure all proper system categories exist (userId: null, isSystem: true, with icons)
  for (const cat of SYSTEM_CATS) {
    const proper = await prisma.category.findFirst({
      where: { isSystem: true, userId: null, name: cat.name, group: cat.group },
    });
    if (!proper) {
      await prisma.category.create({
        data: { name: cat.name, group: cat.group, icon: cat.icon, isSystem: true, userId: null },
      });
      console.log(`  ✅ Created system category: ${cat.icon} ${cat.name} (${cat.group})`);
    } else if (proper.icon !== cat.icon) {
      await prisma.category.update({ where: { id: proper.id }, data: { icon: cat.icon } });
      console.log(`  🔄 Updated icon for: ${cat.name}`);
    }
  }

  // Build lookup of canonical system categories
  const systemCats = await prisma.category.findMany({
    where: { isSystem: true, userId: null },
  });
  const systemLookup = new Map(systemCats.map(c => [`${c.name.toLowerCase()}|${c.group}`, c]));

  let totalReassigned = 0;
  let totalDeleted = 0;

  // Step 2: Merge near-duplicates (Food → Food & Dining, Medical → Healthcare, etc.)
  console.log('\n--- Merging near-duplicates ---');
  for (const [key, target] of Object.entries(MERGE_MAP)) {
    const [oldName, group] = key.split('|');
    const targetCat = systemLookup.get(`${target.name.toLowerCase()}|${target.group}`);
    if (!targetCat) { console.log(`  ⚠️ Target not found: ${target.name}`); continue; }

    const dupes = await prisma.category.findMany({
      where: { name: { equals: oldName, mode: 'insensitive' }, group: group as any },
    });
    for (const dupe of dupes) {
      if (dupe.id === targetCat.id) continue;
      const txCount = await prisma.transaction.count({ where: { categoryId: dupe.id } });
      console.log(`  🔀 "${dupe.name}" (${dupe.isSystem ? 'system' : 'user'}, ${txCount} txns) → "${target.name}"`);
      await reassignAndDelete(dupe.id, targetCat.id, `"${dupe.name}" → "${target.name}"`);
      totalDeleted++;
    }
  }

  // Step 3: Remove bogus "system" categories that have a userId — they're user copies wrongly marked
  console.log('\n--- Removing bogus system categories with userId ---');
  const bogusCats = await prisma.category.findMany({
    where: { isSystem: true, userId: { not: null } },
  });
  for (const bogus of bogusCats) {
    const canonical = systemLookup.get(`${bogus.name.toLowerCase()}|${bogus.group}`);
    if (canonical) {
      const txCount = await prisma.transaction.count({ where: { categoryId: bogus.id } });
      console.log(`  🗑️ "${bogus.name}" (userId: ${bogus.userId!.substring(0, 10)}, ${txCount} txns) → system "${canonical.name}"`);
      await reassignAndDelete(bogus.id, canonical.id, `bogus "${bogus.name}" → system`);
      totalDeleted++;
    } else {
      // No matching system category — convert to user category instead of deleting
      console.log(`  ⚠️ "${bogus.name}" has no system match — converting to user category`);
      await prisma.category.update({ where: { id: bogus.id }, data: { isSystem: false } });
    }
  }

  // Step 4: Remove any remaining user-owned exact duplicates of system categories
  console.log('\n--- Removing remaining user duplicates of system categories ---');
  const userCats = await prisma.category.findMany({ where: { isSystem: false } });
  for (const uc of userCats) {
    const canonical = systemLookup.get(`${uc.name.toLowerCase()}|${uc.group}`);
    if (canonical) {
      const txCount = await prisma.transaction.count({ where: { categoryId: uc.id } });
      console.log(`  🗑️ User "${uc.name}" (${txCount} txns) → system`);
      await reassignAndDelete(uc.id, canonical.id, `user "${uc.name}" → system`);
      totalDeleted++;
    }
  }

  // Final summary
  const finalCats = await prisma.category.findMany({ orderBy: [{ group: 'asc' }, { name: 'asc' }] });
  console.log(`\n🎉 Cleanup complete!`);
  console.log(`   ${totalDeleted} categories removed`);
  console.log(`   ${finalCats.length} categories remaining:\n`);
  for (const c of finalCats) {
    const tag = c.isSystem ? 'SYSTEM' : 'USER';
    const icon = c.icon || '     ';
    console.log(`   ${c.group.padEnd(8)} ${tag.padEnd(6)} ${icon} ${c.name}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
