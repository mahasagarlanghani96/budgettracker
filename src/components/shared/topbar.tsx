'use client';

import { useSession } from 'next-auth/react';
import { User } from 'lucide-react';

export function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
      {/* Spacer for mobile menu button */}
      <div className="w-10 lg:hidden" />

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium leading-none">{session?.user?.name || 'User'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{session?.user?.email}</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
