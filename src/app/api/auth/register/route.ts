import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { registerSchema } from '@/lib/validations/schemas';

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: '💼' },
  { name: 'Freelance', icon: '💻' },
  { name: 'Business Income', icon: '🏢' },
  { name: 'Rental Income', icon: '🏠' },
  { name: 'Interest', icon: '🏦' },
  { name: 'Gift', icon: '🎁' },
  { name: 'Refund', icon: '🔄' },
  { name: 'Other Income', icon: '💰' },
];
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍽️' },
  { name: 'Groceries', icon: '🛒' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Fuel', icon: '⛽' },
  { name: 'Utilities', icon: '💡' },
  { name: 'Rent', icon: '🏘️' },
  { name: 'Healthcare', icon: '🏥' },
  { name: 'Education', icon: '📚' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Personal Care', icon: '💇' },
  { name: 'Mobile & Internet', icon: '📱' },
  { name: 'Household', icon: '🧹' },
  { name: 'Clothing', icon: '👔' },
  { name: 'Charity', icon: '🤲' },
  { name: 'Other Expense', icon: '💸' },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
        },
      });

      // Create default income categories
      await tx.category.createMany({
        data: DEFAULT_INCOME_CATEGORIES.map((cat) => ({
          userId: newUser.id,
          name: cat.name,
          group: 'INCOME' as const,
          icon: cat.icon,
          isSystem: false,
        })),
      });

      // Create default expense categories
      await tx.category.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
          userId: newUser.id,
          name: cat.name,
          group: 'EXPENSE' as const,
          icon: cat.icon,
          isSystem: false,
        })),
      });

      return newUser;
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
