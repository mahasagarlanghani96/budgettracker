import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your FinKeep account and start managing your finances.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
