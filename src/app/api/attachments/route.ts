import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

// GET /api/attachments?transactionId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const transactionId = new URL(request.url).searchParams.get('transactionId');
    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 });
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId: session.user.id, isDeleted: false },
    });
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const attachments = await prisma.attachment.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: attachments });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('GET /api/attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/attachments — multipart upload
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const transactionId = formData.get('transactionId') as string | null;

    if (!file || !transactionId) {
      return NextResponse.json({ error: 'file and transactionId are required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId: session.user.id, isDeleted: false },
    });
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = path.extname(file.name) || '';
    const storedName = `${randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, storedName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const attachment = await prisma.attachment.create({
      data: {
        transactionId,
        fileName: file.name,
        filePath: storedName,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('POST /api/attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
