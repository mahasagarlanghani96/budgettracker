import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'People',
  description: 'Manage contacts linked to your loans, committees and transactions.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
