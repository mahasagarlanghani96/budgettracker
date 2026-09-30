import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Overview of your financial health — income, expenses, balances and trends.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
