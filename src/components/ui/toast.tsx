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
            'rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-bottom-5 fade-in',
            toast.variant === 'destructive' && 'border-destructive bg-destructive text-destructive-foreground',
            toast.variant === 'success' && 'border-green-500 bg-green-50 text-green-900',
            toast.variant === 'default' && 'bg-background'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && (
                <p className="text-sm opacity-80 mt-0.5">{toast.description}</p>
              )}
            </div>
            <button onClick={() => dismiss(toast.id)} className="opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
