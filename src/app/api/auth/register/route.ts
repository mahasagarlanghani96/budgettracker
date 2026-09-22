import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { registerSchema } from '@/lib/validations/schemas';

const DEFAULT_INCOME_CATEGORIES = ['Salary', 'Business', 'Freelance', 'Gift', 'Refund', 'Other Income'];
const DEFAULT_EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Bills', 'Shopping', 'Education',
  'Medical', 'Household', 'Rent', 'Utilities', 'Entertainment',
  'Clothing', 'Personal Care', 'Charity', 'Other Expense',
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
          name: cat,
          group: 'INCOME' as const,
          isSystem: true,
        })),
      });

      // Create default expense categories
      await tx.category.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
          userId: newUser.id,
          name: cat,
          group: 'EXPENSE' as const,
          isSystem: true,
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
