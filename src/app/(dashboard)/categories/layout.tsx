import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Organize your income and expense categories.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
