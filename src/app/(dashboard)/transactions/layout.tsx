import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Transactions',
  description: 'Track all your income, expenses and transfers.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
