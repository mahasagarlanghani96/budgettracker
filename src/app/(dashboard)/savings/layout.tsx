import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Savings Goals',
  description: 'Track progress toward your savings targets.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
