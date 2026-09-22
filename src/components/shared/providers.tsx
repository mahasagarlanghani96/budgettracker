'use client';

import { SessionProvider } from 'next-auth/react';
import { ToastContainer } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { PWAInstallPrompt } from '@/components/shared/pwa-install';

function ToastWrapper() {
  const { toasts, dismiss } = useToast();
  return <ToastContainer toasts={toasts} dismiss={dismiss} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <ToastWrapper />
      <PWAInstallPrompt />
    </SessionProvider>
  );
}
