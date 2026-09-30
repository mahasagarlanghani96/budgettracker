import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plot Payments',
  description: 'Track property installment payments and remaining balances.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
