'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/use-pwa-install';

export function PWAInstallPrompt() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(!!localStorage.getItem('pwa-install-dismissed'));
    } catch {
      setDismissed(false);
    }
  }, []);

  async function handleInstall() {
    await promptInstall();
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem('pwa-install-dismissed', '1');
    } catch {}
  }

  if (dismissed || !canInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">Install Budget Tracker</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add to your home screen for quick access
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={handleInstall}>
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
