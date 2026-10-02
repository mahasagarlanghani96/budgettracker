import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

interface ResetToken {
  email: string;
  token: string;
  expiresAt: number;
}

const resetTokens = new Map<string, ResetToken>();

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function cleanExpired() {
  const now = Date.now();
  resetTokens.forEach((val, key) => {
    if (val.expiresAt < now) resetTokens.delete(key);
  });
}

// POST /api/auth/reset-password — request a reset token
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: 'If the email exists, a reset token has been generated.' });
    }

    cleanExpired();

    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, {
      email: normalizedEmail,
      token,
      expiresAt: Date.now() + TOKEN_EXPIRY_MS,
    });

    // In production, this token would be emailed. Since there's no email service,
    // return it directly for admin/dev use.
    return NextResponse.json({
      message: 'If the email exists, a reset token has been generated.',
      resetToken: token,
      expiresIn: '1 hour',
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/auth/reset-password — use the token to set a new password
export async function PUT(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (password.length > 72) {
      return NextResponse.json({ error: 'Password must be at most 72 characters' }, { status: 400 });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
        { status: 400 }
      );
    }

    cleanExpired();

    const entry = resetTokens.get(token);
    if (!entry || entry.expiresAt < Date.now()) {
      resetTokens.delete(token);
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email: entry.email },
      data: { passwordHash },
    });

    resetTokens.delete(token);

    return NextResponse.json({ message: 'Password has been reset successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
