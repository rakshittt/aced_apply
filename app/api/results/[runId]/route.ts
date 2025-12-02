/**
 * GET /api/results/[runId]
 * Get complete analysis results for a job run
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser, verifyOwnership, AuthorizationError } from '@/lib/auth/helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    const { runId } = await params;

    // Verify ownership
    const isOwner = await verifyOwnership(user.id, runId);
    if (!isOwner) {
      throw new AuthorizationError('You do not have permission to access this analysis', 403);
    }

    // Fetch job run with all relations
    const jobRun = await prisma.jobRun.findUnique({
      where: { id: runId },
      include: {
        jd: {
          include: {
            companyResearch: true,
            recruiterPriority: true,
          },
        },
        resume: true,
        fitMap: true,
        changeAdvisor: {
          include: {
            suggestions: true,
          },
        },
        lens: true,
        prepKit: {
          include: {
            days: {
              orderBy: {
                dayNumber: 'asc',
              },
            },
          },
        },
      },
    } as const);

    if (!jobRun) {
      return NextResponse.json(
        { error: 'Job run not found' },
        { status: 404 }
      );
    }

    // Check if expired (30-day retention)
    if (new Date() > jobRun.expiresAt) {
      return NextResponse.json(
        { error: 'Results have expired (30-day retention)' },
        { status: 410 } // 410 Gone
      );
    }

    // Format response
    const response = {
      runId: jobRun.id,
      status: jobRun.status,
      createdAt: jobRun.createdAt,
      ttfi: jobRun.ttfi,
      totalDuration: jobRun.totalDuration,

      jd: {
        title: jobRun.jd.title,
        company: jobRun.jd.company,
        location: jobRun.jd.location,
      },

      fitMap: jobRun.fitMap
        ? {
            overallFit: jobRun.fitMap.overallFit,
            confidence: jobRun.fitMap.confidence,
            overlap: jobRun.fitMap.overlap,
            underEvidenced: jobRun.fitMap.underEvidenced,
            gaps: jobRun.fitMap.gaps,
          }
        : null,

      changeAdvisor: jobRun.changeAdvisor
        ? {
            suggestions: jobRun.changeAdvisor.suggestions.map((s) => ({
              id: s.id,
              targetSection: s.targetSection,
              currentBullet: s.currentBullet,
              suggestedBullet: s.suggestedBullet,
              reason: s.reason,
              requiredMetric: s.requiredMetric,
              evidenceToAttach: s.evidenceToAttach,
              keywordMirror: s.keywordMirror,
              confidence: s.confidence,
              jdSpans: s.jdSpans,
              resumeSpans: s.resumeSpans,
              status: s.status,
            })),
            atsWarnings: jobRun.changeAdvisor.atsWarnings,
          }
        : null,

      lens: jobRun.lens
        ? {
            competencies: jobRun.lens.competencies,
            likelyFormats: jobRun.lens.likelyFormats,
            behaviorCues: jobRun.lens.behaviorCues,
          }
        : null,

      prepKit: jobRun.prepKit
        ? {
            days: jobRun.prepKit.days.map((day) => ({
              dayNumber: day.dayNumber,
              gapRef: day.gapRef,
              companyBehaviorRef: day.companyBehaviorRef,
              inputs: day.inputs,
              practiceTask: day.practiceTask,
              rubric: day.rubric,
              expectedArtifact: day.expectedArtifact,
              timeboxMin: day.timeboxMin,
              completed: day.completed,
              completedAt: day.completedAt,
            })),
          }
        : null,

      companyResearch: jobRun.jd.companyResearch
        ? {
            companyName: jobRun.jd.companyResearch.companyName,
            companySize: jobRun.jd.companyResearch.companySize,
            industry: jobRun.jd.companyResearch.industry,
            techStack: jobRun.jd.companyResearch.techStack,
            cultureSignals: jobRun.jd.companyResearch.cultureSignals,
            seniority: jobRun.jd.companyResearch.seniority,
            reasoning: jobRun.jd.companyResearch.reasoning,
          }
        : null,

      recruiterPriority: jobRun.jd.recruiterPriority
        ? {
            requirements: jobRun.jd.recruiterPriority.requirements,
            mustHaveKeywords: jobRun.jd.recruiterPriority.mustHaveKeywords,
            niceToHaveKeywords: jobRun.jd.recruiterPriority.niceToHaveKeywords,
            overallStrategy: jobRun.jd.recruiterPriority.overallStrategy,
          }
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Results] Error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // Handle authorization errors
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/results/[runId]
 * Self-serve data deletion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    const { runId } = await params;

    // Verify ownership
    const isOwner = await verifyOwnership(user.id, runId);
    if (!isOwner) {
      throw new AuthorizationError('You do not have permission to delete this analysis', 403);
    }

    // Delete job run (CASCADE will delete all related data)
    await prisma.jobRun.delete({
      where: { id: runId },
    });

    return NextResponse.json({
      success: true,
      message: 'Data deleted successfully',
    });
  } catch (error) {
    console.error('[Results] Delete error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // Handle authorization errors
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    );
  }
}
