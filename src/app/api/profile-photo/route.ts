import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { validatePhotoDataUrl } from '@/lib/photo-validation';

// GET /api/profile-photo — serve the profile photo as binary
export async function GET() {
  try {
    const session = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profilePhoto: true, updatedAt: true },
    });

    if (!user?.profilePhoto) {
      return NextResponse.json({ error: 'No profile photo' }, { status: 404 });
    }

    const mimeMatch = user.profilePhoto.match(/^data:(image\/\w+);base64,/);
    if (!mimeMatch) {
      return NextResponse.json({ error: 'Invalid stored photo' }, { status: 500 });
    }

    const mime = mimeMatch[1];
    const base64 = user.profilePhoto.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');
    const etag = `"${user.updatedAt.getTime()}"`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
        'ETag': etag,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/profile-photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/profile-photo — upload or replace profile photo
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const validation = validatePhotoDataUrl(body.photo);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { profilePhoto: body.photo },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('PUT /api/profile-photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/profile-photo — remove profile photo
export async function DELETE() {
  try {
    const session = await requireAuth();

    await prisma.user.update({
      where: { id: session.user.id },
      data: { profilePhoto: null },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/profile-photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
