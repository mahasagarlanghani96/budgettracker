'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
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
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {children}
        <ToastWrapper />
        <PWAInstallPrompt />
      </ThemeProvider>
    </SessionProvider>
  );
}
