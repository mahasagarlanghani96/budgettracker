import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { rateLimit, checkLockout, recordFailedLogin, clearLockout } from './rate-limit';

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const ip = (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
        const { allowed } = rateLimit(`login:${ip}`, 10, 60_000);
        if (!allowed) {
          throw new Error('Too many login attempts. Please try again later.');
        }

        const email = credentials.email.toLowerCase();
        const lockout = checkLockout(email);
        if (lockout.locked) {
          throw new Error('Account temporarily locked due to too many failed attempts. Try again later.');
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.isActive) {
          recordFailedLogin(email);
          throw new Error('Invalid email or password');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          recordFailedLogin(email);
          throw new Error('Invalid email or password');
        }

        clearLockout(email);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
};

/**
 * Get the authenticated user ID from the session.
 * Use this in API routes and server components.
 */
export async function getAuthUserId(): Promise<string | null> {
  // Dynamic import to avoid issues with server components
  const { getServerSession } = await import('next-auth');
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id || null;
}

/**
 * Require authentication — throws if not authenticated.
 * Returns a session-like object with the user's id.
 */
export async function requireAuth(): Promise<{ user: { id: string } }> {
  const { getServerSession } = await import('next-auth');
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return { user: { id: userId } };
}
