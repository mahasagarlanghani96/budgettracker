'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import type { Toast as ToastType } from '@/hooks/use-toast';

export function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: ToastType[];
  dismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'glass rounded-[var(--radius-inner)] px-4 py-3 shadow-lg animate-in slide-in-from-bottom-5 fade-in',
            toast.variant === 'destructive' && 'border-[var(--coral)]/30 bg-[var(--coral-dim)]',
            toast.variant === 'success' && 'border-[var(--emerald)]/30 bg-[var(--emerald-dim)]',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>
              {toast.description && (
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{toast.description}</p>
              )}
            </div>
            <button onClick={() => dismiss(toast.id)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
