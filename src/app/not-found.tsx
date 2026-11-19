import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4 bg-[var(--bg-primary)]">
      <span className="text-6xl font-display font-bold text-[var(--text-primary)]">404</span>
      <h2 className="text-xl font-display font-bold text-[var(--text-primary)]">Page not found</h2>
      <p className="text-sm text-[var(--text-secondary)] max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-md bg-[var(--emerald)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
