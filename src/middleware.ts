import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const res = NextResponse.next();
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return res;
  },
  {
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    // Protect all routes except public ones. API routes ARE included so middleware
    // enforces auth as a safety net (individual handlers still call requireAuth).
    '/((?!login|register|api/auth/|_next/static|_next/image|favicon.ico|icons/|logo.png|manifest.json|sw.js|offline.html).*)',
  ],
};
