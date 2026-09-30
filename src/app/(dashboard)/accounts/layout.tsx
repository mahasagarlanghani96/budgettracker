import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accounts',
  description: 'Manage your bank accounts, wallets and cash balances.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
