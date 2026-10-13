import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from './prisma';
import { rateLimit, checkLockout, recordFailedLogin, clearLockout } from './rate-limit';
import { parseUserAgent } from './user-agent';

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
          select: { id: true, name: true, email: true, passwordHash: true, isActive: true, profilePhoto: true },
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

        const sessionToken = crypto.randomBytes(32).toString('hex');
        const ua = (req?.headers?.['user-agent'] as string) || '';
        const parsed = parseUserAgent(ua);

        await prisma.userSession.create({
          data: {
            userId: user.id,
            token: sessionToken,
            deviceType: parsed.deviceType,
            browser: parsed.browser,
            os: parsed.os,
            ipAddress: ip,
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          hasProfilePhoto: !!user.profilePhoto,
          sessionToken,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.hasProfilePhoto = !!user.hasProfilePhoto;
        token.sessionToken = (user as any).sessionToken;
      }
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { profilePhoto: true },
        });
        token.hasProfilePhoto = !!dbUser?.profilePhoto;
      }

      if (token.sessionToken) {
        await prisma.userSession.updateMany({
          where: { token: token.sessionToken as string, isRevoked: false },
          data: { lastActiveAt: new Date() },
        }).catch(() => {});
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        session.user.hasProfilePhoto = token.hasProfilePhoto ?? false;
      }
      session.sessionToken = token.sessionToken;

      if (token.sessionToken) {
        const dbSession = await prisma.userSession.findUnique({
          where: { token: token.sessionToken as string },
          select: { isRevoked: true },
        });
        if (dbSession?.isRevoked) {
          return null as any;
        }
      }

      return session;
    },
  },
};

export async function getAuthUserId(): Promise<string | null> {
  const { getServerSession } = await import('next-auth');
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id || null;
}

export async function requireAuth(): Promise<{ user: { id: string } }> {
  const { getServerSession } = await import('next-auth');
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return { user: { id: userId } };
}
