import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Loans',
  description: 'Keep track of money lent and borrowed, with repayment history.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
