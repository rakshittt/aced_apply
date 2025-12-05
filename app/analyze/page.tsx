import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import HomeClient from '../home-client';
import { prisma } from '@/lib/db';

export default async function AnalyzePage() {
  const session = await auth();

  // Require authentication
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/analyze');
  }

  // Calculate usage stats from session data
  const { plan, analysisCount, monthlyLimit } = session.user;
  const remaining = Math.max(0, monthlyLimit - analysisCount);
  const percentage = (analysisCount / monthlyLimit) * 100;

  // Fetch User's Resumes
  const resumes = await prisma.resume.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      name: true,
      uploadedAt: true,
      isDefault: true,
    }
  });

  // Fetch User's Past JDs (via JobRuns)
  // We want distinct JDs, but Prisma distinct is limited. 
  // We'll fetch recent runs and deduplicate in JS or just show recent runs.
  const pastRuns = await prisma.jobRun.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      jd: {
        select: {
          id: true,
          title: true,
          company: true,
          rawText: true,
          parsedAt: true,
        }
      }
    }
  });

  // Deduplicate JDs based on ID
  const uniqueJDs = Array.from(new Map(pastRuns.map(run => [run.jd.id, run.jd])).values());

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
      resumes={resumes}
      pastJDs={uniqueJDs}
    />
  );
}
