import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Find transactions, accounts, people and more.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
