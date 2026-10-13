import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const { user } = await requireAuth();

    const sessions = await prisma.userSession.findMany({
      where: { userId: user.id, isRevoked: false },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        deviceType: true,
        browser: true,
        os: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
        token: true,
      },
    });

    return NextResponse.json({ data: sessions });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await requireAuth();
    const { sessionId, revokeAll, currentSessionToken } = await req.json();

    if (revokeAll) {
      await prisma.userSession.updateMany({
        where: {
          userId: user.id,
          isRevoked: false,
          ...(currentSessionToken ? { token: { not: currentSessionToken } } : {}),
        },
        data: { isRevoked: true },
      });
      return NextResponse.json({ message: 'All other sessions revoked' });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = await prisma.userSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    return NextResponse.json({ message: 'Session revoked' });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
