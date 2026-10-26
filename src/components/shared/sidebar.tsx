'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  HandCoins,
  Users,
  PiggyBank,
  TrendingUp,
  MapPin,
  BarChart3,
  Target,
  Settings,
  Search,
  LogOut,
  Menu,
  X,
  Contact,
  Tags,
  Trophy,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import Image from 'next/image';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/accounts', label: 'Accounts', icon: Wallet },
      { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/loans', label: 'Loans', icon: HandCoins },
      { href: '/committees', label: 'Committees', icon: Users },
      { href: '/savings', label: 'Savings', icon: PiggyBank },
      { href: '/investments', label: 'Investments', icon: TrendingUp },
      { href: '/plots', label: 'Plots', icon: MapPin },
    ],
  },
  {
    label: 'More',
    items: [
      { href: '/people', label: 'People', icon: Contact },
      { href: '/sports', label: 'Sports', icon: Trophy },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/targets', label: 'Targets', icon: Target },
      { href: '/categories', label: 'Categories', icon: Tags },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-center px-5 py-4 border-b border-[var(--glass-border)]">
        <Image src="/logo.png" alt="FinKeep" width={160} height={80} className="h-14 w-auto object-contain" />
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <Link
          href="/search"
          className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-tertiary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-secondary)] transition-colors"
          onClick={() => setMobileOpen(false)}
        >
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] hidden sm:inline">⌘K</kbd>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--text-tertiary)]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'relative flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-[13.5px] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-[var(--emerald-dim)] text-[var(--emerald)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--emerald)]" />
                    )}
                    <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--glass-border)] px-3 py-3 space-y-1">
        {session?.user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar
              name={session.user.name || 'User'}
              hasProfilePhoto={session.user.hasProfilePhoto}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{session.user.name}</p>
              <p className="text-[11px] text-[var(--text-tertiary)] truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--coral-dim)] hover:text-[var(--coral)] transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--bg-elevated)] p-2 lg:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5 text-[var(--text-primary)]" /> : <Menu className="h-5 w-5 text-[var(--text-primary)]" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-60 flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--glass-border)] transform transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:border-r lg:border-[var(--glass-border)] lg:bg-[var(--bg-sidebar)] lg:fixed lg:inset-y-0">
        {navContent}
      </aside>
    </>
  );
}
