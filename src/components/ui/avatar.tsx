'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

interface AvatarProps {
  name: string;
  hasProfilePhoto?: boolean;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, hasProfilePhoto, src, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = src || (hasProfilePhoto ? '/api/profile-photo' : null);
  const showImage = imgSrc && !imgError;

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium overflow-hidden',
        sizes[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={imgSrc}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
