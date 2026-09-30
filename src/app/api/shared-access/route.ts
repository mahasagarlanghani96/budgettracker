import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const createSchema = z.object({
  email: z.string().email(),
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
  accessLevel: z.enum(['VIEW', 'EDIT', 'ADMIN']).default('VIEW'),
});

// GET /api/shared-access?resourceType=account&resourceId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get('resourceType');
    const resourceId = searchParams.get('resourceId');

    if (!resourceType || !resourceId) {
      return NextResponse.json({ error: 'resourceType and resourceId are required' }, { status: 400 });
    }

    const shares = await prisma.sharedAccess.findMany({
      where: { resourceType, resourceId, sharedById: session.user.id },
      include: { sharedWith: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: shares });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/shared-access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/shared-access — invite user by email
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validated = createSchema.parse(body);

    // Can't share with yourself
    const targetUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'No user found with that email' }, { status: 404 });
    }

    if (targetUser.id === session.user.id) {
      return NextResponse.json({ error: 'You cannot share with yourself' }, { status: 400 });
    }

    // Verify ownership of the resource
    if (validated.resourceType === 'account') {
      const account = await prisma.account.findFirst({
        where: { id: validated.resourceId, userId: session.user.id },
      });
      if (!account) {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
      }
    }

    const share = await prisma.sharedAccess.upsert({
      where: {
        sharedById_sharedWithId_resourceType_resourceId: {
          sharedById: session.user.id,
          sharedWithId: targetUser.id,
          resourceType: validated.resourceType,
          resourceId: validated.resourceId,
        },
      },
      update: { accessLevel: validated.accessLevel },
      create: {
        sharedById: session.user.id,
        sharedWithId: targetUser.id,
        resourceType: validated.resourceType,
        resourceId: validated.resourceId,
        accessLevel: validated.accessLevel,
      },
      include: { sharedWith: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ data: share }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Validation failed', details: (error as { issues: unknown }).issues }, { status: 400 });
    }
    console.error('POST /api/shared-access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
