/**
 * GET /api/coach/[stage]
 * Get interview coach card for specific stage
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, InterviewStage } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stage: string }> }
) {
  try {
    const { stage } = await params;

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

    // Fetch coach card
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
      whatMeasured: coachCard.whatMeasured,
      scaffold: coachCard.scaffold,
      failureModes: coachCard.failureModes,
      followUps: coachCard.followUps,
    });
  } catch (error) {
    console.error('[Coach] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coach card' },
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
