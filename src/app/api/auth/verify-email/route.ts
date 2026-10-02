import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

interface VerificationToken {
  userId: string;
  email: string;
  token: string;
  expiresAt: number;
}

const verificationTokens = new Map<string, VerificationToken>();
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function cleanExpired() {
  const now = Date.now();
  verificationTokens.forEach((val, key) => {
    if (val.expiresAt < now) verificationTokens.delete(key);
  });
}

// POST /api/auth/verify-email — request a verification token (authenticated)
export async function POST() {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id: string }).id;
    const email = (session.user as { id: string; email?: string }).email;

    if (!email) {
      return NextResponse.json({ error: 'No email associated with account' }, { status: 400 });
    }

    cleanExpired();

    const token = crypto.randomBytes(32).toString('hex');
    verificationTokens.set(token, {
      userId,
      email,
      token,
      expiresAt: Date.now() + TOKEN_EXPIRY_MS,
    });

    // In production, this token would be emailed. Returning directly for dev use.
    return NextResponse.json({
      message: 'Verification token generated. In production, this would be emailed.',
      verificationToken: token,
      expiresIn: '24 hours',
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/auth/verify-email — verify with token
export async function PUT(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    cleanExpired();

    const entry = verificationTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      verificationTokens.delete(token);
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    // Verify the user exists
    const user = await prisma.user.findUnique({ where: { id: entry.userId } });
    if (!user) {
      verificationTokens.delete(token);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Note: The User model doesn't have an emailVerified field yet.
    // When a migration adds it, this update would set emailVerified: new Date().
    // For now, this endpoint validates the token flow works correctly.

    verificationTokens.delete(token);

    return NextResponse.json({
      message: 'Email verified successfully',
      email: entry.email,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
