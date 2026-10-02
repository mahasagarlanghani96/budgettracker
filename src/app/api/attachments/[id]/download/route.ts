import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { readFile } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

// GET /api/attachments/:id/download
export async function GET(
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

    const filePath = path.join(UPLOAD_DIR, attachment.filePath);
    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${attachment.fileName.replace(/[\r\n"\\]/g, '_')}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/attachments/download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
