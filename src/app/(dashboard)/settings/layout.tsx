import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your profile and account preferences.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
