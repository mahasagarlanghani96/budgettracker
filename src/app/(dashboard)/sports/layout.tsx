import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sports',
  description: 'Manage your sports teams, matches, and expenses.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
