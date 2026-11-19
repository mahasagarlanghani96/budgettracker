'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <AlertTriangle className="h-12 w-12 text-[var(--amber)]" />
      <h2 className="text-xl font-display font-bold text-[var(--text-primary)]">Something went wrong</h2>
      <p className="text-sm text-[var(--text-secondary)] max-w-md">
        An unexpected error occurred. Please try again or refresh the page.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    </div>
  );
}
