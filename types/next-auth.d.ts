/**
 * NextAuth Type Extensions
 * Extends default NextAuth types to include custom user fields
 */

import { SubscriptionPlan } from '@prisma/client';
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      plan: SubscriptionPlan;
      analysisCount: number;
      monthlyLimit: number;
      hasPaymentMethod: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    plan?: SubscriptionPlan;
    analysisCount?: number;
    monthlyLimit?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    plan?: SubscriptionPlan;
    analysisCount?: number;
    monthlyLimit?: number;
  }
}
