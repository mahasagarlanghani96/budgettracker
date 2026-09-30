import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Committees',
  description: 'Manage your savings committees, members, rounds and contributions.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
