/**
 * NextAuth.js v5 Configuration
 * Handles authentication with OAuth providers, credentials, and email magic links
 */

import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Resend from 'next-auth/providers/resend';
import Credentials from 'next-auth/providers/credentials';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/db';

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    // Email/Password Credentials (always available for development)
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
        password: { label: 'Password', type: 'password', placeholder: '••••••••' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          // User doesn't exist - redirect to sign up
          console.log(`Sign in attempted for non-existent user: ${email}`);
          return null;
        }

        // Check if user has a password (not OAuth-only user)
        if (!user.password) {
          // OAuth user trying to sign in with credentials
          console.log(`OAuth user attempted credentials login: ${email}`);
          return null;
        }

        // Verify password
        const isValid = await compare(password, user.password);
        if (!isValid) {
          console.log(`Invalid password for: ${email}`);
          return null;
        }

        return user;
      },
    }),

    // Google OAuth (requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // GitHub OAuth (requires GITHUB_ID and GITHUB_SECRET)
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // Email magic links (requires EMAIL_SERVER and EMAIL_FROM)
    ...(process.env.EMAIL_SERVER && process.env.EMAIL_FROM
      ? [
          Resend({
            apiKey: process.env.RESEND_API_KEY!,
            from: process.env.EMAIL_FROM,
          }),
        ]
      : []),
  ],

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - store all user data in token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.plan = (user as any).plan || 'FREE';
        token.analysisCount = (user as any).analysisCount || 0;
        token.monthlyLimit = (user as any).monthlyLimit || 3;
        token.hasPaymentMethod = !!(user as any).stripeCustomerId;
      }

      // Update session trigger (called from client to refresh user data)
      if (trigger === 'update' && session) {
        return { ...token, ...session };
      }

      return token;
    },

    async session({ session, token }) {
      // Pass user data from token to session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.image = token.picture as string | null;
        session.user.plan = token.plan as any;
        session.user.analysisCount = token.analysisCount as number;
        session.user.monthlyLimit = token.monthlyLimit as number;
        session.user.hasPaymentMethod = token.hasPaymentMethod as boolean;
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      // Allow sign in
      return true;
    },

    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after sign in
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },

  events: {
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`);

      // Initialize user with FREE plan
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: 'FREE',
          monthlyLimit: 3,
          analysisCount: 0,
          lastReset: new Date(),
        },
      });
    },
  },

  session: {
    strategy: 'jwt', // Required for Credentials provider
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  debug: process.env.NODE_ENV === 'development',
});
