import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { unlink } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

// DELETE /api/attachments/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: { transaction: { select: { userId: true } } },
    });

    if (!attachment || attachment.transaction.userId !== session.user.id) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    try {
      await unlink(path.join(UPLOAD_DIR, attachment.filePath));
    } catch {
      // file may already be missing
    }

    await prisma.attachment.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('DELETE /api/attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
