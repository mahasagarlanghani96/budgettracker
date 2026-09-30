'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Trash2, Paperclip, FileText, Image } from 'lucide-react';

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export function AttachmentSection({ transactionId }: { transactionId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/attachments?transactionId=${transactionId}`)
      .then((r) => r.json())
      .then((res) => setAttachments(res.data || []))
      .catch(() => setError('Failed to load attachments'));
  }, [transactionId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('transactionId', transactionId);

    try {
      const res = await fetch('/api/attachments', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Upload failed');
      } else {
        setAttachments((prev) => [json.data, ...prev]);
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      setError('Failed to delete attachment');
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments
          {attachments.length > 0 && (
            <span className="text-xs text-muted-foreground">({attachments.length})</span>
          )}
        </CardTitle>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.txt,.csv,.xlsx,.xls"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-3">{error}</p>
        )}

        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No attachments yet.</p>
        ) : (
          <ul className="divide-y">
            {attachments.map((att) => (
              <li key={att.id} className="flex items-center gap-3 py-2.5 group">
                <FileIcon mimeType={att.mimeType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{att.fileName}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={`/api/attachments/${att.id}/download`} download>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(att.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
