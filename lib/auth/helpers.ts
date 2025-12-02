/**
 * Authentication Helper Utilities
 * Provides reusable functions for authentication, authorization, and usage tracking
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import type { User } from 'next-auth';

/**
 * Get the currently authenticated user session
 * Throws an error if user is not authenticated
 */
export async function getAuthenticatedUser(): Promise<User> {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized: Please sign in to continue');
  }

  return session.user;
}

/**
 * Check if user has reached their monthly analysis limit
 * Returns true if user can still create analyses
 */
export async function checkUsageLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  plan: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      analysisCount: true,
      monthlyLimit: true,
      lastReset: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if we need to reset monthly count (30 days have passed)
  const daysSinceReset = Math.floor(
    (Date.now() - new Date(user.lastReset).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceReset >= 30) {
    // Reset the counter
    await prisma.user.update({
      where: { id: userId },
      data: {
        analysisCount: 0,
        lastReset: new Date(),
      },
    });

    return {
      allowed: true,
      remaining: user.monthlyLimit,
      limit: user.monthlyLimit,
      plan: user.plan,
    };
  }

  const remaining = Math.max(0, user.monthlyLimit - user.analysisCount);
  const allowed = user.analysisCount < user.monthlyLimit;

  return {
    allowed,
    remaining,
    limit: user.monthlyLimit,
    plan: user.plan,
  };
}

/**
 * Increment user's analysis count after successful analysis
 */
export async function incrementUsageCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      analysisCount: {
        increment: 1,
      },
    },
  });
}

/**
 * Verify that a user owns a specific JobRun
 * Returns true if user is the owner, false otherwise
 */
export async function verifyOwnership(
  userId: string,
  jobRunId: string
): Promise<boolean> {
  const jobRun = await prisma.jobRun.findUnique({
    where: { id: jobRunId },
    select: { userId: true },
  });

  if (!jobRun) {
    return false;
  }

  return jobRun.userId === userId;
}

/**
 * Get user's usage statistics
 */
export async function getUserUsage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      analysisCount: true,
      monthlyLimit: true,
      lastReset: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const remaining = Math.max(0, user.monthlyLimit - user.analysisCount);
  const percentage = (user.analysisCount / user.monthlyLimit) * 100;

  return {
    plan: user.plan,
    used: user.analysisCount,
    limit: user.monthlyLimit,
    remaining,
    percentage,
    lastReset: user.lastReset,
  };
}

/**
 * Authorization error class for consistent error handling
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Usage limit error class
 */
export class UsageLimitError extends Error {
  constructor(
    message: string,
    public limit: number,
    public plan: string
  ) {
    super(message);
    this.name = 'UsageLimitError';
  }
}
