import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Financial Targets',
  description: 'Set and monitor your monthly income, expense and savings goals.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
