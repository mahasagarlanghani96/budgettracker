import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investments',
  description: 'Monitor your investment portfolio and returns.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
