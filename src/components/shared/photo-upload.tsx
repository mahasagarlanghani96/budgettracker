'use client';

import { useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { processProfilePhoto } from '@/lib/image-utils';
import { Camera, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoUploadProps {
  name: string;
  currentHasPhoto?: boolean;
  previewUrl?: string | null;
  onPhotoChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

export function PhotoUpload({ name, currentHasPhoto, previewUrl, onPhotoChange, disabled }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPhoto = previewUrl || currentHasPhoto;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = '';

    setError(null);
    setProcessing(true);
    try {
      const dataUrl = await processProfilePhoto(file);
      onPhotoChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setProcessing(false);
    }
  }

  function handleRemove() {
    setError(null);
    onPhotoChange(null);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar
          name={name || 'User'}
          hasProfilePhoto={currentHasPhoto}
          src={previewUrl || undefined}
          size="lg"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || processing}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        >
          {processing ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || processing}
        >
          {processing ? 'Processing...' : hasPhoto ? 'Change Photo' : 'Upload Photo'}
        </Button>
        {hasPhoto && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled || processing}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Remove
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
