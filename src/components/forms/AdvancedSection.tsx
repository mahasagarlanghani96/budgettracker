'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvancedSectionProps {
  label?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * A collapsible disclosure for rarely-used form fields (isPrivate, tax,
 * currency, exchange rate, etc.) so the primary form stays focused.
 */
export function AdvancedSection({ label = 'Advanced Options', defaultOpen = false, children }: AdvancedSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {label}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all',
          open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-4 px-3 pb-3 pt-1">{children}</div>
      </div>
    </div>
  );
}
