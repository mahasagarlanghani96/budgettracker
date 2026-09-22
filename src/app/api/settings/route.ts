import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET /api/settings — get user profile
export async function GET() {
  try {
    const session = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { id: (session.user as { id: string }).id },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        timezone: true,
        createdAt: true,
        _count: {
          select: {
            accounts: true,
            transactions: true,
            loans: true,
            committees: true,
          },
        },
      },
    });

    return NextResponse.json({ data: user });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/settings — update profile
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.name) updateData.name = body.name;
    if (body.currency) updateData.currency = body.currency;
    if (body.timezone) updateData.timezone = body.timezone;

    // Password change
    if (body.currentPassword && body.newPassword) {
      const user = await prisma.user.findUnique({
        where: { id: (session.user as { id: string }).id },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      if (body.newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
      }

      updateData.passwordHash = await bcrypt.hash(body.newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: (session.user as { id: string }).id },
      data: updateData,
      select: { id: true, name: true, email: true, currency: true, timezone: true },
    });

    return NextResponse.json({ data: user });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
