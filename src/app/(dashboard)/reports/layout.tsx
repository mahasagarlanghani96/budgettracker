import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Analyze your financial data with charts and summaries.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
