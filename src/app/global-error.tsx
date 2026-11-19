'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#0a0f1a', color: '#e5e7eb' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>An unexpected error occurred. Please try again.</p>
          <button
            onClick={reset}
            style={{ padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#1fa08a', color: 'white', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
