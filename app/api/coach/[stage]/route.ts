/**
 * GET /api/coach/[stage]?jobRunId=xxx
 * Get personalized interview coaching based on user's analysis results
 * Falls back to static coach card if no jobRunId provided
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, InterviewStage } from '@/lib/db';
import { generatePersonalizedCoach } from '@/lib/analyzers/personalized-coach-analyzer';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stage: string }> }
) {
  try {
    const { stage } = await params;
    const { searchParams } = new URL(request.url);
    const jobRunId = searchParams.get('jobRunId');

    // Validate stage
    const validStages = Object.values(InterviewStage);
    const upperStage = stage.toUpperCase();

    if (!validStages.includes(upperStage as InterviewStage)) {
      return NextResponse.json(
        {
          error: 'Invalid stage',
          validStages: validStages,
        },
        { status: 400 }
      );
    }

    // If jobRunId provided, generate personalized coaching
    if (jobRunId) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Fetch job run with all analysis results
      const jobRun = await prisma.jobRun.findUnique({
        where: { id: jobRunId },
        include: {
          jd: true,
          resume: true,
          fitMap: true,
          lens: true,
        },
      });

      if (!jobRun) {
        return NextResponse.json({ error: 'Job run not found' }, { status: 404 });
      }

      // Verify ownership
      if (jobRun.userId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Check if analysis is complete
      if (jobRun.status !== 'COMPLETED') {
        return NextResponse.json(
          { error: 'Analysis not yet complete', status: jobRun.status },
          { status: 400 }
        );
      }

      if (!jobRun.fitMap || !jobRun.lens) {
        return NextResponse.json(
          { error: 'Analysis results incomplete' },
          { status: 400 }
        );
      }

      // Generate personalized coaching
      const personalizedCoach = await generatePersonalizedCoach({
        interviewStage: upperStage,
        jdText: jobRun.jd.rawText,
        resumeText: jobRun.resume.rawText,
        gaps: (jobRun.fitMap.gaps as any[]).map((g: any) => ({
          skill: g.skill,
          severity: g.severity,
        })),
        overlaps: (jobRun.fitMap.overlap as any[]).map((o: any) => ({
          skill: o.skill,
        })),
        behaviorCues: (jobRun.lens.behaviorCues as any[]).map((b: any) => ({
          cue: b.cue,
          implication: b.implication,
        })),
      });

      return NextResponse.json({
        stage: upperStage,
        personalized: true,
        jobRunId: jobRun.id,
        ...personalizedCoach,
      });
    }

    // Fallback: Fetch static coach card
    const coachCard = await prisma.coachCard.findUnique({
      where: { stage: upperStage as InterviewStage },
    });

    if (!coachCard) {
      return NextResponse.json(
        { error: 'Coach card not found for this stage' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      stage: coachCard.stage,
      personalized: false,
      whatMeasured: coachCard.whatMeasured,
      scaffold: coachCard.scaffold,
      failureModes: coachCard.failureModes,
      followUps: coachCard.followUps,
    });
  } catch (error) {
    console.error('[Coach] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate coaching' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/coach
 * Get all coach cards
 */
export async function getAllCoachCards() {
  const cards = await prisma.coachCard.findMany({
    orderBy: {
      stage: 'asc',
    },
  });

  return cards;
}
