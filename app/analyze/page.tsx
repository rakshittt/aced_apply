/**
 * Analysis Page
 * Protected route for authenticated users to upload resume and analyze job fit
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import HomeClient from '../home-client';

export default async function AnalyzePage() {
  const session = await auth();

  // Require authentication
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/analyze');
  }

  // Calculate usage stats from session data (no database query needed)
  const { plan, analysisCount, monthlyLimit } = session.user;
  const remaining = Math.max(0, monthlyLimit - analysisCount);
  const percentage = (analysisCount / monthlyLimit) * 100;

  // Render the analysis interface with user data
  return (
    <HomeClient
      user={{
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name || null,
        plan,
        used: analysisCount,
        limit: monthlyLimit,
        remaining,
        percentage,
      }}
    />
  );
}
